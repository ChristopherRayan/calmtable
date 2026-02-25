"""Database models for menu, reservations, reviews, ordering, notifications, and staff members."""
from copy import deepcopy
import secrets
import string
from decimal import Decimal
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


def default_frontend_content() -> dict:
    """Return default editable content payload for frontend pages."""
    return {
        "brand_name": "The CalmTable",
        "brand_tagline": "Dine with Dignity",
        "contact": {
            "address_line_1": "Near Simso Filling Station",
            "address_line_2": "Luwinga, Mzuzu, Malawi",
            "phone": "+265 999 000 000",
            "email": "hello@calmtable.mw",
            "whatsapp": "+265 888 000 000",
            "map_embed_url": "https://maps.google.com/maps?q=Simso%20Filling%20Station%2C%20Luwinga%2C%20Mzuzu%2C%20Malawi&t=&z=15&ie=UTF8&iwloc=&output=embed",
            "opening_hours": [
                {"day": "Monday - Friday", "hours": "07:00 - 21:00"},
                {"day": "Saturday", "hours": "08:00 - 22:00"},
                {"day": "Sunday", "hours": "Closed"},
            ],
        },
        "home": {
            "hero_eyebrow": "The CalmTable & Family Restaurant",
            "hero_title_prefix": "Modern fine dining with a",
            "hero_title_emphasis": "calm atmosphere",
            "hero_title_suffix": "and unforgettable flavors.",
            "hero_description": "Join us for handcrafted dishes, warm hospitality, and premium ambiance near Simso Filling Station, Luwinga, Mzuzu.",
            "story_quote": "Good food is the foundation of genuine happiness - we serve both.",
            "story_description": "The CalmTable started as a family kitchen with one promise: feed every guest with dignity and care. Today we serve Malawian favorites, fresh fish, and heritage recipes in a refined, welcoming setting.",
            "about_features": [
                {"title": "Fresh Daily", "description": "Cooked every morning"},
                {"title": "Family Owned", "description": "Since 2012"},
                {"title": "Made with Care", "description": "Every single plate"},
            ],
            "why_items": [
                {"title": "Local Ingredients", "description": "We source directly from Malawian suppliers for daily freshness."},
                {"title": "Family Atmosphere", "description": "Every guest receives warm, dignified, and personal service."},
                {"title": "Fast Service", "description": "Meals arrive hot and quickly, without compromising quality."},
                {"title": "Hygiene First", "description": "Clean kitchen, strict standards, and consistent food safety."},
            ],
            "stats": {
                "years_serving": "12+",
                "menu_items": "80+",
                "rating": "4.9★",
            },
            "reservation_banner_title": "Book a Table for",
            "reservation_banner_emphasis": "An Unforgettable Evening",
            "reservation_banner_description": "Reserve your table in advance and let us prepare your premium dining experience.",
            "testimonials": [
                {"quote": "The Chambo was absolutely divine. I keep coming back because the quality never drops.", "author": "Amara Nkhoma"},
                {"quote": "Our family reunion was hosted perfectly. Warm service, great portions, and elegant atmosphere.", "author": "Chisomo Banda"},
                {"quote": "Best Masamba Otendera in Mzuzu. Authentic taste and consistently professional service.", "author": "Takondwa Mwale"},
            ],
            "gallery_images": [
                "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=900&q=80",
                "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
                "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80",
                "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
            ],
        },
        "about": {
            "description": "Near Simso Filling Station in Luwinga, we serve premium dishes in a warm family-restaurant setting.",
            "cards": [
                {"title": "Vision", "body": "Build a modern Malawian dining brand where consistency, comfort, and quality define every table."},
                {"title": "Cuisine", "body": "Local favorites and signature mains from chambo to goat dishes, with curated snacks and beverages."},
                {"title": "Service", "body": "Fast reservations, smooth checkout, and attentive hosting for both casual and formal dining moments."},
            ],
        },
        "members": {
            "description": "Create an account and unlock premium dining perks designed for regular guests and families.",
            "benefits": [
                {"title": "Priority Reservations", "description": "Members get early access to peak evening slots and seasonal tasting nights before public release."},
                {"title": "Member-only Offers", "description": "Receive curated discounts on signature dishes, family platters, and selected beverages every month."},
                {"title": "Birthday Rewards", "description": "Celebrate with a complimentary dessert pairing and a personalized table setup for your birthday booking."},
                {"title": "Faster Checkout", "description": "Saved account details and order history help members reorder favorites and complete checkout in seconds."},
            ],
        },
    }


def deep_merge_dict(base: dict, override: dict) -> dict:
    """Recursively merge override payload into base payload."""
    merged = deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


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


class FrontendSettings(models.Model):
    """Singleton JSON payload for editable frontend copy and media settings."""

    key = models.CharField(max_length=24, unique=True, default="default", editable=False)
    content = models.JSONField(default=default_frontend_content, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Frontend Settings"
        verbose_name_plural = "Frontend Settings"

    def __str__(self) -> str:
        return "Frontend Settings"

    @classmethod
    def get_solo(cls):
        """Return singleton frontend settings row, creating defaults if missing."""
        obj, _ = cls.objects.get_or_create(
            key="default",
            defaults={"content": default_frontend_content()},
        )
        return obj

    def resolved_content(self) -> dict:
        """Return content merged with defaults to keep older payloads compatible."""
        return deep_merge_dict(default_frontend_content(), self.content or {})


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


class Order(models.Model):
    """A customer order and Stripe payment tracking record."""

    class Status(models.TextChoices):
        """Supported lifecycle states for customer orders."""

        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    order_number = models.CharField(max_length=20, unique=True, editable=False, blank=True, null=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    customer_name = models.CharField(max_length=120, blank=True)
    customer_email = models.EmailField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    notes = models.TextField(blank=True)
    stripe_payment_intent_id = models.CharField(max_length=120, blank=True)  # legacy optional payment id
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["customer", "status", "created_at"]),
            models.Index(fields=["order_number"]),
        ]

    def __str__(self) -> str:
        customer_label = self.customer_name or "Guest"
        return f"Order {self.order_number or self.pk} — {customer_label}"

    @property
    def user(self):
        """Backwards-compatible alias for previous field naming."""
        return self.customer

    @property
    def email(self) -> str:
        """Backwards-compatible alias for previous field naming."""
        return self.customer_email

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"CC-{uuid.uuid4().hex[:8].upper()}"
        if self.customer:
            full_name = f"{self.customer.first_name} {self.customer.last_name}".strip()
            if not self.customer_name:
                self.customer_name = full_name or self.customer.get_username() or self.customer.email or "Guest"
            if not self.customer_email:
                self.customer_email = self.customer.email or ""
        super().save(*args, **kwargs)


class AdminNotification(models.Model):
    """Staff notification payload for operational events like new orders."""

    class Type(models.TextChoices):
        NEW_ORDER = "new_order", "New Order"
        STATUS_UPDATE = "status_update", "Status Update"
        GENERAL = "general", "General"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
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
    notif_type = models.CharField(max_length=30, choices=Type.choices, default=Type.GENERAL)
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
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.PROTECT,
        related_name="order_items",
        null=True,
        blank=True,
    )
    item_name = models.CharField(max_length=200, blank=True)
    item_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ("id",)

    def __str__(self) -> str:
        return f"{self.quantity}x {self.item_name or self.menu_item_id}"

    def clean(self) -> None:
        if self.quantity < 1:
            raise ValidationError({"quantity": "Quantity must be at least 1."})

    def save(self, *args, **kwargs):
        if not self.item_name and self.menu_item_id:
            self.item_name = self.menu_item.name
        if self.item_price <= 0 and self.unit_price > 0:
            self.item_price = self.unit_price
        if self.unit_price <= 0 and self.item_price > 0:
            self.unit_price = self.item_price

        computed_total = Decimal(self.quantity) * self.unit_price
        self.line_total = computed_total
        self.subtotal = computed_total
        self.full_clean()
        return super().save(*args, **kwargs)


class StaffMember(models.Model):
    """Admin-managed staff profile cards for the public members page."""

    class Role(models.TextChoices):
        CHEF = "chef", "Chef"
        WAITER = "waiter", "Waiter / Waitress"
        CASHIER = "cashier", "Cashier"
        MANAGER = "manager", "Manager"
        CLEANER = "cleaner", "Cleaning Staff"
        SECURITY = "security", "Security"
        DELIVERY = "delivery", "Delivery"
        OTHER = "other", "Other"

    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=30, choices=Role.choices)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    photo = models.ImageField(upload_to="staff/", blank=True, null=True)
    bio = models.TextField(blank=True)
    hire_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    display_on_website = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("role", "full_name")

    def __str__(self) -> str:
        return f"{self.full_name} ({self.get_role_display()})"
