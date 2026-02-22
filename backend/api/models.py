"""Database models for menu items and table reservations."""
import secrets
import string

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
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
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    dietary_tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Reservation(models.Model):
    """A reservation request for a specific date and time slot."""

    class Status(models.TextChoices):
        """Supported lifecycle states for reservations."""

        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

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

    def __str__(self) -> str:
        return f"{self.confirmation_code} - {self.name}"

    def clean(self) -> None:
        now_local = timezone.localtime(timezone.now())

        if self.party_size < 1 or self.party_size > 20:
            raise ValidationError({"party_size": "Party size must be between 1 and 20."})

        if self.date < now_local.date():
            raise ValidationError({"date": "Reservations cannot be made for past dates."})

        if self.date == now_local.date() and self.time_slot <= now_local.time().replace(second=0, microsecond=0):
            raise ValidationError({"time_slot": "Reservations cannot be made for past time slots."})

        active_statuses = [self.Status.PENDING, self.Status.CONFIRMED]
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
