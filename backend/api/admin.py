"""Admin configuration for menu, reservations, reviews, and orders."""
from django import forms
from django.contrib import admin

from .models import AdminNotification, MenuItem, Order, OrderItem, Reservation, Review, UserProfile

admin.site.site_header = "The CalmTable Administration"
admin.site.site_title = "The CalmTable Admin"
admin.site.index_title = "Operational control center"


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
        self.fields["image_url"].help_text = "Optional external image URL."
        self.fields["image_file"].help_text = "Optional direct upload from your device."

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
    list_display = ("name", "category", "price", "is_available", "is_featured", "has_uploaded_image")
    list_filter = ("category", "is_available", "is_featured")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")

    @admin.display(boolean=True, description="Uploaded image")
    def has_uploaded_image(self, obj: MenuItem) -> bool:
        return bool(obj.image_file)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    """Admin table for reservation status management."""

    list_display = (
        "name",
        "user",
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
        for reservation in queryset:
            reservation.status = Reservation.Status.CONFIRMED
            reservation.save(update_fields=["status"])

    @admin.action(description="Mark selected reservations as cancelled")
    def mark_cancelled(self, request, queryset):
        for reservation in queryset:
            reservation.status = Reservation.Status.CANCELLED
            reservation.save(update_fields=["status"])


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin table for menu item reviews and ratings."""

    list_display = ("menu_item", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("menu_item__name", "user__username", "comment")


class OrderItemInline(admin.TabularInline):
    """Inline order item rows for order admin page."""

    model = OrderItem
    extra = 0
    readonly_fields = ("line_total",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Admin table for customer orders and payment status."""

    list_display = ("id", "email", "status", "total_amount", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("email", "stripe_payment_intent_id")
    readonly_fields = ("created_at", "updated_at", "stripe_payment_intent_id")
    inlines = (OrderItemInline,)
    actions = ("mark_paid", "mark_cancelled")

    @admin.action(description="Mark selected orders as paid")
    def mark_paid(self, request, queryset):
        queryset.update(status=Order.Status.PAID)

    @admin.action(description="Mark selected orders as cancelled")
    def mark_cancelled(self, request, queryset):
        queryset.update(status=Order.Status.CANCELLED)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin table for user profile phone numbers and avatars."""

    list_display = ("user", "phone", "has_avatar", "updated_at")
    search_fields = ("user__username", "user__email", "phone")
    readonly_fields = ("created_at", "updated_at")

    @admin.display(boolean=True, description="Avatar")
    def has_avatar(self, obj: UserProfile) -> bool:
        return bool(obj.profile_image)


@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    """Admin table for staff notifications generated by operational events."""

    list_display = ("id", "recipient", "title", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("title", "message", "recipient__username", "recipient__email")
    readonly_fields = ("created_at",)
