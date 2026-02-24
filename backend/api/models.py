"""Database models for menu, reservations, reviews, and ordering."""
import secrets
import string
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class MenuItem(models.Model):
    """A dish or drink available on the restaurant menu."""

    class Category(models.TextChoices):
        """Supported menu item categories."""

        STARTERS = "starters", "Starters"
        MAINS = "mains", "Mains"
        DESSERTS = "desserts", "Desserts"
        DRINKS = "drinks", "Drinks"

    name = models.CharField(max_length=120)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices)
    image_url = models.URLField(blank=True)
    image_file = models.ImageField(upload_to="menu_items/", blank=True, null=True)
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    dietary_tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=["is_available", "category"]),
            models.Index(fields=["is_featured", "is_available"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def preferred_image_url(self) -> str:
        """Return uploaded image URL first, with URL-field fallback."""
        if self.image_file:
            return self.image_file.url
        return self.image_url


class UserProfile(models.Model):
    """Extended profile metadata for customer and staff users."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    phone = models.CharField(max_length=30, blank=True)
    profile_image = models.ImageField(upload_to="profiles/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("user_id",)

    def __str__(self) -> str:
        return f"Profile<{self.user_id}>"


class Reservation(models.Model):
    """A reservation request for a specific date and time slot."""

    class Status(models.TextChoices):
        """Supported lifecycle states for reservations."""

        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    date = models.DateField()
    time_slot = models.TimeField()
    party_size = models.PositiveSmallIntegerField()
    special_requests = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    confirmation_code = models.CharField(max_length=8, unique=True, db_index=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["date", "time_slot", "status"]),
            models.Index(fields=["user", "date"]),
        ]

    def __str__(self) -> str:
        return f"{self.confirmation_code} - {self.name}"

    @staticmethod
    def user_has_completed_reservation(user) -> bool:
        """Return whether a user has at least one past confirmed reservation."""
        if not user or not user.is_authenticated:
            return False

        now_local = timezone.localtime(timezone.now())
        base_filter = Q(status=Reservation.Status.CONFIRMED) & (
            Q(date__lt=now_local.date())
            | Q(date=now_local.date(), time_slot__lt=now_local.time().replace(second=0, microsecond=0))
        )

        user_filter = Q(user=user)
        if user.email:
            user_filter |= Q(email__iexact=user.email)

        return Reservation.objects.filter(base_filter & user_filter).exists()

    def clean(self) -> None:
        now_local = timezone.localtime(timezone.now())
        original_date = None
        original_time_slot = None
        if self.pk:
            original = Reservation.objects.filter(pk=self.pk).values("date", "time_slot").first()
            if original:
                original_date = original["date"]
                original_time_slot = original["time_slot"]

        schedule_changed = (
            self.pk is None
            or original_date != self.date
            or original_time_slot != self.time_slot
        )

        if self.party_size < 1 or self.party_size > 20:
            raise ValidationError({"party_size": "Party size must be between 1 and 20."})

        if schedule_changed:
            if self.date < now_local.date():
                raise ValidationError({"date": "Reservations cannot be made for past dates."})

            if self.date == now_local.date() and self.time_slot <= now_local.time().replace(second=0, microsecond=0):
                raise ValidationError({"time_slot": "Reservations cannot be made for past time slots."})

        active_statuses = [self.Status.PENDING, self.Status.CONFIRMED]
        if self.status in active_statuses:
            existing = Reservation.objects.filter(
                date=self.date,
                time_slot=self.time_slot,
                status__in=active_statuses,
            )
            if self.pk:
                existing = existing.exclude(pk=self.pk)

            if existing.count() >= settings.MAX_RESERVATIONS_PER_SLOT:
                raise ValidationError(
                    {"time_slot": "This time slot is fully booked. Please choose another slot."}
                )

    @staticmethod
    def generate_confirmation_code(length: int = 8) -> str:
        """Generate a random uppercase alphanumeric confirmation code."""
        alphabet = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(length))

    def save(self, *args, **kwargs):
        if not self.confirmation_code:
            while True:
                candidate = self.generate_confirmation_code()
                if not Reservation.objects.filter(confirmation_code=candidate).exists():
                    self.confirmation_code = candidate
                    break

        self.full_clean()
        return super().save(*args, **kwargs)


class Review(models.Model):
    """A user-submitted rating and comment for a menu item."""

    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=["menu_item", "user"], name="unique_review_per_user_per_item")
        ]

    def __str__(self) -> str:
        return f"Review<{self.menu_item_id}:{self.user_id}>"

    def clean(self) -> None:
        if not Reservation.user_has_completed_reservation(self.user):
            raise ValidationError("Only verified diners with completed reservations can leave reviews.")


class Order(models.Model):
    """A customer order and Stripe payment tracking record."""

    class Status(models.TextChoices):
        """Supported lifecycle states for customer orders."""

        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    email = models.EmailField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    stripe_payment_intent_id = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"Order<{self.pk}> {self.email}"


class AdminNotification(models.Model):
    """Staff notification payload for operational events like new orders."""

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_notifications",
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_notifications",
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["recipient", "is_read", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"AdminNotification<{self.id}:{self.recipient_id}>"


class OrderItem(models.Model):
    """A single purchasable item attached to an order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ("id",)

    def __str__(self) -> str:
        return f"OrderItem<{self.order_id}:{self.menu_item_id}>"

    def clean(self) -> None:
        if self.quantity < 1:
            raise ValidationError({"quantity": "Quantity must be at least 1."})

    def save(self, *args, **kwargs):
        self.line_total = Decimal(self.quantity) * self.unit_price
        self.full_clean()
        return super().save(*args, **kwargs)
