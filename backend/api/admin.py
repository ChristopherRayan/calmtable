"""Admin configuration for menu and reservation management."""
from django import forms
from django.contrib import admin

from .models import MenuItem, Reservation


class MenuItemAdminForm(forms.ModelForm):
    """Admin form with comma-separated dietary tags editing."""

    dietary_tags_text = forms.CharField(
        required=False,
        help_text="Comma-separated values, e.g. vegan,gluten-free",
        label="Dietary tags",
    )

    class Meta:
        model = MenuItem
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        existing_tags = self.instance.dietary_tags if self.instance and self.instance.pk else []
        self.fields["dietary_tags_text"].initial = ",".join(existing_tags)

    def clean_dietary_tags_text(self):
        value = self.cleaned_data.get("dietary_tags_text", "")
        return [tag.strip() for tag in value.split(",") if tag.strip()]

    def save(self, commit=True):
        self.instance.dietary_tags = self.cleaned_data.get("dietary_tags_text", [])
        return super().save(commit=commit)


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    """Admin table for menu items and availability controls."""

    form = MenuItemAdminForm
    list_display = ("name", "category", "price", "is_available", "is_featured")
    list_filter = ("category", "is_available", "is_featured")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    """Admin table for reservation status management."""

    list_display = (
        "name",
        "date",
        "time_slot",
        "party_size",
        "status",
        "confirmation_code",
    )
    list_filter = ("date", "status")
    search_fields = ("name", "email", "phone", "confirmation_code", "date")
    readonly_fields = ("confirmation_code", "created_at")
    actions = ("mark_confirmed", "mark_cancelled")

    @admin.action(description="Mark selected reservations as confirmed")
    def mark_confirmed(self, request, queryset):
        queryset.update(status=Reservation.Status.CONFIRMED)

    @admin.action(description="Mark selected reservations as cancelled")
    def mark_cancelled(self, request, queryset):
        queryset.update(status=Reservation.Status.CANCELLED)
