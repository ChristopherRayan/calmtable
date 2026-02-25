"""Custom Django admin site and model admin configuration for The CalmTable."""
import csv
import json
from datetime import timedelta

from django import forms
from django.contrib import admin
from django.contrib.admin import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import GroupAdmin as DjangoGroupAdmin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.models import Group
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    AdminNotification,
    FrontendSettings,
    MenuItem,
    Order,
    OrderItem,
    Reservation,
    Review,
    UserProfile,
)

User = get_user_model()


def status_badge(value: str) -> str:
    """Return colored badge HTML for status-like values."""
    normalized = (value or "").lower()
    if normalized in {"confirmed", "paid", "active", "available", "yes", "true", "read"}:
        klass = "badge-success"
    elif normalized in {"pending", "warning"}:
        klass = "badge-warning"
    elif normalized in {"cancelled", "inactive", "unavailable", "no", "false"}:
        klass = "badge-danger"
    else:
        klass = "badge-info"
    return format_html('<span class="status-badge {}">{}</span>', klass, (value or "unknown").title())


def previous_month_start(month_start):
    """Return first day of the previous month."""
    return (month_start - timedelta(days=1)).replace(day=1)


class CalmTableAdminSite(AdminSite):
    """Fully customized admin site with dashboard analytics context."""

    site_header = "The CalmTable Administration"
    site_title = "The CalmTable Admin"
    index_title = "Operational Control Center"
    index_template = "admin/index.html"

    def has_permission(self, request):
        return bool(request.user and request.user.is_active and request.user.is_staff)

    def has_module_perms(self, request):
        return self.has_permission(request)

    def index(self, request, extra_context=None):
        month_cursor = timezone.localdate().replace(day=1)
        month_starts = []
        for _ in range(6):
            month_starts.append(month_cursor)
            month_cursor = previous_month_start(month_cursor)
        month_starts.reverse()
        first_month = month_starts[0]

        month_labels = [month.strftime("%b %Y") for month in month_starts]
        month_index = {month.strftime("%Y-%m"): idx for idx, month in enumerate(month_starts)}

        def to_series(queryset):
            series = [0] * len(month_starts)
            for row in queryset:
                month_value = row["month"]
                month_key = month_value.strftime("%Y-%m")
                if month_key in month_index:
                    series[month_index[month_key]] = row["total"]
            return series

        reservation_qs = (
            Reservation.objects.filter(date__gte=first_month)
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Count("id"))
            .order_by("month")
        )
        order_qs = (
            Order.objects.filter(created_at__date__gte=first_month)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Count("id"))
            .order_by("month")
        )
        review_qs = (
            Review.objects.filter(created_at__date__gte=first_month)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Count("id"))
            .order_by("month")
        )

        model_counts = {
            "users": User.objects.count(),
            "menu_items": MenuItem.objects.count(),
            "reservations": Reservation.objects.count(),
            "orders": Order.objects.count(),
            "reviews": Review.objects.count(),
            "profiles": UserProfile.objects.count(),
            "notifications": AdminNotification.objects.count(),
        }

        recent_reservations = Reservation.objects.order_by("-created_at")[:5]
        recent_activity = [
            {
                "confirmation_code": record.confirmation_code,
                "name": record.name,
                "email": record.email,
                "date": record.date.strftime("%Y-%m-%d"),
                "time_slot": record.time_slot.strftime("%H:%M"),
                "status": record.status,
            }
            for record in recent_reservations
        ]

        analytics_payload = {
            "labels": month_labels,
            "datasets": [
                {
                    "label": "Reservations",
                    "data": to_series(reservation_qs),
                    "borderColor": "#5C4033",
                    "backgroundColor": "rgba(92,64,51,0.25)",
                },
                {
                    "label": "Orders",
                    "data": to_series(order_qs),
                    "borderColor": "#D2B48C",
                    "backgroundColor": "rgba(210,180,140,0.25)",
                },
                {
                    "label": "Reviews",
                    "data": to_series(review_qs),
                    "borderColor": "#3B82F6",
                    "backgroundColor": "rgba(59,130,246,0.18)",
                },
            ],
        }

        context = {
            "dashboard_cards": [
                {"label": "Users", "value": model_counts["users"]},
                {"label": "Reservations", "value": model_counts["reservations"]},
                {"label": "Orders", "value": model_counts["orders"]},
                {"label": "Menu Items", "value": model_counts["menu_items"]},
            ],
            "model_counts": model_counts,
            "recent_activity": recent_activity,
            "analytics_json": json.dumps(analytics_payload),
        }
        if extra_context:
            context.update(extra_context)
        return super().index(request, extra_context=context)


custom_admin_site = CalmTableAdminSite(name="calmtable_admin")


class BaseModelAdmin(admin.ModelAdmin):
    """Shared admin behaviors across models."""

    list_per_page = 25
    actions = ("export_to_csv",)

    @admin.action(description="Export selected rows to CSV")
    def export_to_csv(self, request, queryset):
        model_meta = self.model._meta
        field_names = [field.name for field in model_meta.fields]

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{model_meta.model_name}.csv"'
        writer = csv.writer(response)
        writer.writerow(field_names)

        for obj in queryset:
            writer.writerow([getattr(obj, field) for field in field_names])
        return response


class UserAdmin(BaseModelAdmin, DjangoUserAdmin):
    """User admin with deactivation-only lifecycle controls."""

    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "active_badge",
        "is_staff",
        "last_login",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "date_joined")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-id",)
    date_hierarchy = "date_joined"
    readonly_fields = ("date_joined", "last_login")
    fieldsets = (
        ("Identity", {"fields": ("username", "email", "password")}),
        ("Personal", {"fields": ("first_name", "last_name"), "classes": ("collapse",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Activity", {"fields": ("last_login", "date_joined"), "classes": ("collapse",)}),
    )
    actions = BaseModelAdmin.actions + ("activate_selected_users", "deactivate_selected_users")

    @admin.display(description="Status")
    def active_badge(self, obj):
        return status_badge("active" if obj.is_active else "inactive")

    @admin.action(description="Activate selected users")
    def activate_selected_users(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Deactivate selected users")
    def deactivate_selected_users(self, request, queryset):
        queryset.update(is_active=False)

    def has_delete_permission(self, request, obj=None):
        return False

    def get_actions(self, request):
        actions = super().get_actions(request)
        actions.pop("delete_selected", None)
        return actions


class GroupAdmin(BaseModelAdmin, DjangoGroupAdmin):
    """Group admin with CSV export support."""

    ordering = ("-id",)


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


class MenuItemAdmin(BaseModelAdmin):
    """Menu item management admin."""

    form = MenuItemAdminForm
    list_display = (
        "name",
        "category",
        "price",
        "availability_badge",
        "is_featured",
        "created_at",
    )
    list_filter = ("category", "is_available", "is_featured", "created_at")
    search_fields = ("name", "description", "category")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Core", {"fields": ("name", "description", "category", "price")}),
        ("Media", {"fields": ("image_file", "image_url"), "classes": ("collapse",)}),
        ("Availability", {"fields": ("is_available", "is_featured", "dietary_tags_text")}),
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
    actions = BaseModelAdmin.actions + (
        "mark_available",
        "mark_unavailable",
        "mark_featured",
        "duplicate_selected",
    )

    @admin.display(description="Availability")
    def availability_badge(self, obj):
        return status_badge("available" if obj.is_available else "unavailable")

    @admin.action(description="Mark selected items available")
    def mark_available(self, request, queryset):
        queryset.update(is_available=True)

    @admin.action(description="Mark selected items unavailable")
    def mark_unavailable(self, request, queryset):
        queryset.update(is_available=False)

    @admin.action(description="Mark selected items featured")
    def mark_featured(self, request, queryset):
        queryset.update(is_featured=True)

    @admin.action(description="Duplicate selected menu items")
    def duplicate_selected(self, request, queryset):
        duplicated = 0
        for item in queryset:
            item.pk = None
            item.is_featured = False
            item.created_at = None
            item.updated_at = None
            item.save()
            duplicated += 1
        self.message_user(request, f"Duplicated {duplicated} menu items.")


class ReservationAdmin(BaseModelAdmin):
    """Reservation status management admin."""

    list_display = (
        "confirmation_code",
        "name",
        "email",
        "date",
        "time_slot",
        "party_size",
        "status_badge_column",
        "created_at",
    )
    list_filter = ("status", "date", "created_at")
    search_fields = ("name", "email", "phone", "confirmation_code")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("confirmation_code", "created_at")
    fieldsets = (
        ("Guest", {"fields": ("user", "name", "email", "phone")}),
        ("Schedule", {"fields": ("date", "time_slot", "party_size", "status")}),
        ("Details", {"fields": ("special_requests",), "classes": ("collapse",)}),
        ("Audit", {"fields": ("confirmation_code", "created_at"), "classes": ("collapse",)}),
    )
    actions = BaseModelAdmin.actions + ("mark_confirmed", "mark_cancelled", "mark_pending")

    @admin.display(description="Status")
    def status_badge_column(self, obj):
        return status_badge(obj.status)

    def has_add_permission(self, request):
        return False

    @admin.action(description="Mark selected reservations as confirmed")
    def mark_confirmed(self, request, queryset):
        queryset.update(status=Reservation.Status.CONFIRMED)

    @admin.action(description="Mark selected reservations as cancelled")
    def mark_cancelled(self, request, queryset):
        queryset.update(status=Reservation.Status.CANCELLED)

    @admin.action(description="Mark selected reservations as pending")
    def mark_pending(self, request, queryset):
        queryset.update(status=Reservation.Status.PENDING)


class ReviewAdmin(BaseModelAdmin):
    """Review moderation and lookup admin."""

    list_display = ("menu_item", "user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("menu_item__name", "user__username", "user__email", "comment")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Review", {"fields": ("menu_item", "user", "rating", "comment")}),
        ("Audit", {"fields": ("created_at",), "classes": ("collapse",)}),
    )
    actions = BaseModelAdmin.actions + ("set_rating_five", "set_rating_three")

    def has_add_permission(self, request):
        return False

    @admin.action(description="Set selected reviews to 5 stars")
    def set_rating_five(self, request, queryset):
        queryset.update(rating=5)

    @admin.action(description="Set selected reviews to 3 stars")
    def set_rating_three(self, request, queryset):
        queryset.update(rating=3)


class OrderItemInline(admin.TabularInline):
    """Inline order item rows for order admin page."""

    model = OrderItem
    extra = 0
    readonly_fields = ("line_total",)


class OrderAdmin(BaseModelAdmin):
    """Customer order and payment status admin."""

    list_display = ("id", "email", "status_badge_column", "total_amount", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("email", "stripe_payment_intent_id")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "updated_at", "stripe_payment_intent_id")
    inlines = (OrderItemInline,)
    fieldsets = (
        ("Order", {"fields": ("user", "email", "status", "total_amount")}),
        ("Payment", {"fields": ("stripe_payment_intent_id",), "classes": ("collapse",)}),
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
    actions = BaseModelAdmin.actions + ("mark_paid", "mark_cancelled", "mark_pending")

    @admin.display(description="Status")
    def status_badge_column(self, obj):
        return status_badge(obj.status)

    def has_add_permission(self, request):
        return False

    @admin.action(description="Mark selected orders as paid")
    def mark_paid(self, request, queryset):
        queryset.update(status=Order.Status.PAID)

    @admin.action(description="Mark selected orders as cancelled")
    def mark_cancelled(self, request, queryset):
        queryset.update(status=Order.Status.CANCELLED)

    @admin.action(description="Mark selected orders as pending")
    def mark_pending(self, request, queryset):
        queryset.update(status=Order.Status.PENDING)


class OrderItemAdmin(BaseModelAdmin):
    """Order item line management admin."""

    list_display = ("order", "menu_item", "quantity", "unit_price", "line_total")
    list_filter = ("order__status",)
    search_fields = ("order__email", "menu_item__name")
    ordering = ("-id",)
    fieldsets = (
        ("Line Item", {"fields": ("order", "menu_item", "quantity", "unit_price", "line_total")}),
    )
    readonly_fields = ("line_total",)


class UserProfileAdmin(BaseModelAdmin):
    """User profile metadata admin."""

    list_display = ("user", "phone", "has_avatar", "created_at", "updated_at")
    list_filter = ("created_at", "updated_at")
    search_fields = ("user__username", "user__email", "phone")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Profile", {"fields": ("user", "phone", "profile_image")}),
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(boolean=True, description="Avatar")
    def has_avatar(self, obj):
        return bool(obj.profile_image)


class AdminNotificationAdmin(BaseModelAdmin):
    """Staff notification admin."""

    list_display = ("id", "recipient", "title", "read_badge", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("title", "message", "recipient__username", "recipient__email")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Notification", {"fields": ("recipient", "order", "title", "message", "payload", "is_read")}),
        ("Audit", {"fields": ("created_at",), "classes": ("collapse",)}),
    )
    actions = BaseModelAdmin.actions + ("mark_read", "mark_unread")

    @admin.display(description="Read")
    def read_badge(self, obj):
        return status_badge("read" if obj.is_read else "unread")

    @admin.action(description="Mark selected notifications as read")
    def mark_read(self, request, queryset):
        queryset.update(is_read=True)

    @admin.action(description="Mark selected notifications as unread")
    def mark_unread(self, request, queryset):
        queryset.update(is_read=False)


class FrontendSettingsAdmin(BaseModelAdmin):
    """Singleton frontend settings admin."""

    list_display = ("key", "updated_at")
    list_filter = ("updated_at",)
    search_fields = ("key",)
    ordering = ("-updated_at", "-id")
    date_hierarchy = "updated_at"
    readonly_fields = ("key", "updated_at")
    fieldsets = (
        ("CMS", {"fields": ("key", "content")}),
        ("Audit", {"fields": ("updated_at",), "classes": ("collapse",)}),
    )

    def has_add_permission(self, request):
        return not FrontendSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        obj.key = "default"
        super().save_model(request, obj, form, change)


custom_admin_site.register(User, UserAdmin)
custom_admin_site.register(Group, GroupAdmin)
custom_admin_site.register(MenuItem, MenuItemAdmin)
custom_admin_site.register(Reservation, ReservationAdmin)
custom_admin_site.register(Review, ReviewAdmin)
custom_admin_site.register(Order, OrderAdmin)
custom_admin_site.register(OrderItem, OrderItemAdmin)
custom_admin_site.register(UserProfile, UserProfileAdmin)
custom_admin_site.register(AdminNotification, AdminNotificationAdmin)
custom_admin_site.register(FrontendSettings, FrontendSettingsAdmin)
