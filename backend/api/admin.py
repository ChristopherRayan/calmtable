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
from django.contrib.admin.models import LogEntry
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import path
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
    StaffMember,
    Table,
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

    def each_context(self, request):
        """Inject unread notification totals and recent list into every admin page."""
        context = super().each_context(request)
        if request.user and request.user.is_authenticated:
            qs = AdminNotification.objects.filter(recipient=request.user)
            context["unread_notifications_count"] = qs.filter(is_read=False).count()
            context["recent_notifications"] = qs.order_by("-created_at")[:5]
        return context

    def get_urls(self):
        """Expose a internal redirection endpoint for notification clicking."""
        urls = super().get_urls()
        custom_urls = [
            path(
                "notifications/resolve/<int:pk>/",
                self.admin_view(self.resolve_notification),
                name="resolve_notification",
            ),
        ]
        return custom_urls + urls

    def resolve_notification(self, request, pk):
        """Mark a notification as read and redirect to the target detail page."""
        notification = get_object_or_404(AdminNotification, pk=pk, recipient=request.user)
        notification.is_read = True
        notification.save(update_fields=["is_read"])

        if notification.order:
            from django.urls import reverse
            return redirect(reverse("admin:api_order_change", args=[notification.order.pk]))
        if notification.reservation:
            return redirect(reverse("admin:api_reservation_change", args=[notification.reservation.pk]))
        if notification.link_url:
            return redirect(notification.link_url)

        return redirect("admin:index")

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



class UserForm(forms.ModelForm):
    """Merged form for User and UserProfile fields."""

    role = forms.ChoiceField(choices=UserProfile.Role.choices, required=False)
    phone = forms.CharField(max_length=20, required=False)
    image = forms.ImageField(required=False, label="Profile Image")
    password = forms.CharField(widget=forms.PasswordInput(), required=False, help_text="Enter a new password to change it.")

    class Meta:
        model = User
        fields = ("first_name", "last_name", "email", "username")
        widgets = {
            "username": forms.HiddenInput(),
        }
        labels = {
            "last_name": "Surname",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            try:
                profile = self.instance.profile
                self.fields["role"].initial = profile.role
                self.fields["phone"].initial = profile.phone
                self.fields["image"].initial = profile.profile_image
            except UserProfile.DoesNotExist:
                pass
        
        # Ensure email is treated as username
        self.fields["email"].required = True

    def clean(self):
        cleaned_data = super().clean()
        email = cleaned_data.get("email")
        if email:
            cleaned_data["username"] = email
        return cleaned_data


class UserAdmin(DjangoUserAdmin, BaseModelAdmin):
    """User admin with deactivation-only lifecycle controls."""

    list_display = DjangoUserAdmin.list_display + ("role_display", "active_badge")
    list_filter = DjangoUserAdmin.list_filter + ("profile__role",)
    search_fields = DjangoUserAdmin.search_fields + ("profile__phone",)
    readonly_fields = ("date_joined", "last_login")


    fieldsets = (
        (
            "Essential Information",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "password",
                    "role",
                    "phone",
                    "image",
                )
            },
        ),
    )
    add_fieldsets = fieldsets
    form = UserForm
    add_form = UserForm

    def save_model(self, request, obj, form, change):
        # Default username to email if empty
        if not obj.username:
            obj.username = obj.email
        
        # Handle password hashing
        password = form.cleaned_data.get("password")
        if password and (not obj.pk or 'password' in form.changed_data):
            obj.set_password(password)
        
        # Determine if we should force a password change (for new staff)
        is_new = not obj.pk
        role = form.cleaned_data.get("role")
        
        # Set is_staff based on role - only if current user is a superuser
        # or explicitly authorized to grant staff access
        if role and role != UserProfile.Role.CUSTOMER:
            # Only superusers can grant staff access
            if request.user.is_superuser:
                obj.is_staff = True
            elif not change:  # For new users, if not superuser, don't auto-grant staff
                pass  # Keep is_staff as default (False for new users)
            elif obj.is_staff:  # For existing users being edited, preserve existing value
                pass  # Don't change it
        
        super().save_model(request, obj, form, change)

        # Sync Profile
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        if role:
            profile.role = role
        if form.cleaned_data.get("phone"):
            profile.phone = form.cleaned_data.get("phone")
        if form.cleaned_data.get("image"):
            profile.profile_image = form.cleaned_data.get("image")
        
        if is_new and obj.is_staff:
            profile.must_change_password = True
            
        profile.save()

    @admin.display(description="Role")
    def role_display(self, obj):
        profile = getattr(obj, "profile", None)
        if profile:
            return profile.get_role_display()
        return "—"
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


class TableAdmin(BaseModelAdmin):
    """Table management for reservations."""

    list_display = (
        "table_number",
        "capacity",
        "description",
        "is_active_badge",
        "reservation_count",
        "created_at",
    )
    list_filter = ("is_active", "capacity", "created_at")
    search_fields = ("table_number", "description")
    ordering = ("table_number",)
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Table Info", {"fields": ("table_number", "capacity", "description")}),
        ("Status", {"fields": ("is_active",)}),
        ("Audit", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    @admin.display(description="Active", boolean=True)
    def is_active_badge(self, obj):
        return obj.is_active

    @admin.display(description="Reservations")
    def reservation_count(self, obj):
        from django.db.models import Count
        count = obj.reservations.filter(
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED]
        ).count()
        return count


class ReservationAdmin(BaseModelAdmin):
    """Reservation status management admin."""

    list_display = (
        "confirmation_code",
        "name",
        "email",
        "date",
        "time_slot",
        "party_size",
        "table_display",
        "party_duration_display",
        "status_badge_column",
        "created_at",
    )
    list_filter = ("status", "date", "table", "created_at")
    search_fields = ("name", "email", "phone", "confirmation_code", "table__table_number")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("confirmation_code", "created_at")
    fieldsets = (
        ("Guest", {"fields": ("user", "name", "email", "phone")}),
        ("Reservation Details", {"fields": ("date", "time_slot", "party_size", "party_duration_hours", "table", "status")}),
        ("Details", {"fields": ("special_requests",), "classes": ("collapse",)}),
        ("Audit", {"fields": ("confirmation_code", "created_at"), "classes": ("collapse",)}),
    )
    actions = BaseModelAdmin.actions + ("mark_confirmed", "mark_cancelled", "mark_pending")

    @admin.display(description="Table")
    def table_display(self, obj):
        if obj.table:
            return f"Table {obj.table.table_number} (Seats {obj.table.capacity})"
        return "—"

    @admin.display(description="Duration")
    def party_duration_display(self, obj):
        return f"{obj.party_duration_hours}h"

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
    can_delete = False
    show_change_link = False
    readonly_fields = (
        "menu_item",
        "item_name",
        "item_price",
        "quantity",
        "subtotal",
        "unit_price",
        "line_total",
    )

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class OrderAdmin(BaseModelAdmin):
    """Customer order and payment status admin."""

    list_display = (
        "order_number",
        "customer_name",
        "customer_email",
        "item_count",
        "total_display",
        "status_badge_column",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "customer_name", "customer_email")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = (
        "order_number",
        "customer",
        "customer_reference",
        "customer_name",
        "customer_email",
        "status",
        "total_amount",
        "notes",
        "created_at",
        "updated_at",
        "assigned_chef",
        "download_receipt_link",
    )
    inlines = (OrderItemInline,)
    fieldsets = (
        (
            "Order",
            {
                "fields": (
                    "order_number",
                    "customer",
                    "customer_reference",
                    "customer_name",
                    "customer_email",
                    "status",
                    "total_amount",
                    "notes",
                    "assigned_chef",
                )
            },
        ),
        ("Audit", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
        ("Receipt", {"fields": ("download_receipt_link",)}),
    )
    actions = BaseModelAdmin.actions + ("download_receipt_action",)

    @admin.display(description="Status")
    def status_badge_column(self, obj):
        return status_badge(obj.status)

    @admin.display(description="Items")
    def item_count(self, obj):
        return obj.items.count()

    @admin.display(description="Total")
    def total_display(self, obj):
        formatted_total = f"{obj.total_amount:,.0f}"
        return format_html("<strong>MK {}</strong>", formatted_total)

    @admin.display(description="Customer ID / Name")
    def customer_reference(self, obj):
        if obj.customer_id:
            full_name = (f"{obj.customer.first_name} {obj.customer.last_name}".strip() or obj.customer.get_username())
            return f"#{obj.customer_id} - {full_name}"
        if obj.customer_name:
            return f"Unlinked - {obj.customer_name}"
        if obj.customer_email:
            return f"Unlinked - {obj.customer_email}"
        return "-"

    @admin.display(description="Receipt")
    def download_receipt_link(self, obj):
        return format_html(
            '<a href="/api/orders/{}/receipt/" target="_blank" style="color:#D2B48C">'
            '<i class="fas fa-file-pdf"></i> Download PDF</a>',
            obj.order_number,
        )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.action(description="Download receipt PDF")
    def download_receipt_action(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(request, "Select exactly one order to download receipt.", level="warning")
            return None
        order = queryset.first()
        from .pdf import generate_receipt_pdf

        buffer = generate_receipt_pdf(order)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="CalmTable-{order.order_number}.pdf"'
        return response


class OrderItemAdmin(BaseModelAdmin):
    """Order item line management admin."""

    list_display = ("order", "menu_item", "quantity", "unit_price", "line_total")
    list_filter = ("order__status",)
    search_fields = ("order__customer_email", "order__order_number", "menu_item__name", "item_name")
    ordering = ("-id",)
    fieldsets = (
        ("Line Item", {"fields": ("order", "menu_item", "item_name", "item_price", "quantity", "subtotal")}),
    )
    readonly_fields = ("order", "menu_item", "item_name", "item_price", "quantity", "subtotal", "unit_price", "line_total")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False



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

    list_display = ("id", "recipient", "notif_type", "title", "read_badge", "created_at")
    list_filter = ("notif_type", "is_read", "created_at")
    search_fields = ("title", "message", "recipient__username", "recipient__email")
    ordering = ("-created_at", "-id")
    date_hierarchy = "created_at"
    readonly_fields = ("recipient", "order", "reservation", "title", "message", "notif_type", "payload", "is_read", "created_at")
    fieldsets = (
        ("Notification", {"fields": ("recipient", "order", "reservation", "title", "message", "notif_type", "payload", "is_read")}),
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

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class StaffMemberAdmin(BaseModelAdmin):
    """Staff member directory admin for public team page content."""

    list_display = (
        "photo_preview",
        "full_name",
        "role_badge",
        "email",
        "phone",
        "is_active",
        "display_on_website",
    )
    list_filter = ("role", "is_active", "display_on_website")
    search_fields = ("full_name", "email", "phone")
    list_editable = ("is_active", "display_on_website")
    ordering = ("role", "full_name")
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Personal Info", {"fields": ("full_name", "role", "photo", "bio")}),
        ("Contact", {"fields": ("email", "phone")}),
        ("Status", {"fields": ("hire_date", "is_active", "display_on_website", "created_at")}),
    )

    @admin.display(description="Photo")
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="width:38px;height:38px;border-radius:50%;'
                'object-fit:cover;border:2px solid #D2B48C"/>',
                obj.photo.url,
            )
        initials = "".join(part[0] for part in obj.full_name.split()[:2]).upper()
        return format_html(
            '<div style="width:38px;height:38px;border-radius:50%;background:#5C4033;color:#fff;'
            'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">{}</div>',
            initials,
        )

    @admin.display(description="Role")
    def role_badge(self, obj):
        return format_html(
            '<span style="background:rgba(210,180,140,.2);color:#5C4033;padding:3px 10px;'
            'border-radius:3px;font-size:11px;font-weight:600;text-transform:uppercase">{}</span>',
            obj.get_role_display(),
        )


from django.utils.safestring import mark_safe

class JSONImageWidget(forms.FileInput):
    def render(self, name, value, attrs=None, renderer=None):
        input_html = super().render(name, None, attrs, renderer)
        if value and isinstance(value, str):
            preview = f'<div style="margin-top: 5px; margin-bottom: 10px;"><img src="{value}" style="max-height: 120px; border-radius: 6px; border: 1px solid #ccc; background: #222;" /><br><small>Current: <a href="{value}" target="_blank">{value}</a></small></div>'
            return mark_safe(preview + input_html)
        return input_html


class FrontendSettingsForm(forms.Form):
    """Custom form that decomposes the FrontendSettings JSON blob into explicit fields."""

    # ── Brand ──
    brand_name = forms.CharField(max_length=100, required=False, label="Brand Name")
    brand_tagline = forms.CharField(max_length=200, required=False, label="Brand Tagline")

    # ── Hero ──
    hero_eyebrow = forms.CharField(max_length=200, required=False, label="Eyebrow Text")
    hero_title_prefix = forms.CharField(max_length=200, required=False, label="Title Prefix")
    hero_title_emphasis = forms.CharField(max_length=200, required=False, label="Title Emphasis")
    hero_title_suffix = forms.CharField(max_length=200, required=False, label="Title Suffix")
    hero_description = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False, label="Description")
    hero_bg_image = forms.ImageField(required=False, label="Hero Background Image", widget=JSONImageWidget)

    # ── Stats ──
    stat_years_serving = forms.CharField(max_length=20, required=False, label="Years Serving")
    stat_menu_items = forms.CharField(max_length=20, required=False, label="Menu Items")
    stat_rating = forms.CharField(max_length=20, required=False, label="Rating")

    # ── Story ──
    story_quote = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Quote")
    story_description = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False, label="Description")
    about_feature_1_title = forms.CharField(max_length=100, required=False, label="Feature 1 Title")
    about_feature_1_desc = forms.CharField(max_length=200, required=False, label="Feature 1 Description")
    about_feature_2_title = forms.CharField(max_length=100, required=False, label="Feature 2 Title")
    about_feature_2_desc = forms.CharField(max_length=200, required=False, label="Feature 2 Description")
    about_feature_3_title = forms.CharField(max_length=100, required=False, label="Feature 3 Title")
    about_feature_3_desc = forms.CharField(max_length=200, required=False, label="Feature 3 Description")

    # ── Why Us ──
    why_1_title = forms.CharField(max_length=100, required=False, label="Item 1 Title")
    why_1_desc = forms.CharField(max_length=300, required=False, label="Item 1 Description")
    why_2_title = forms.CharField(max_length=100, required=False, label="Item 2 Title")
    why_2_desc = forms.CharField(max_length=300, required=False, label="Item 2 Description")
    why_3_title = forms.CharField(max_length=100, required=False, label="Item 3 Title")
    why_3_desc = forms.CharField(max_length=300, required=False, label="Item 3 Description")
    why_4_title = forms.CharField(max_length=100, required=False, label="Item 4 Title")
    why_4_desc = forms.CharField(max_length=300, required=False, label="Item 4 Description")

    # ── Reservation Banner ──
    reservation_banner_title = forms.CharField(max_length=200, required=False, label="Banner Title")
    reservation_banner_emphasis = forms.CharField(max_length=200, required=False, label="Banner Emphasis")
    reservation_banner_description = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Banner Description")
    reservation_bg_image = forms.ImageField(required=False, label="Reservation Banner Image", widget=JSONImageWidget)

    # ── Testimonials ──
    testimonial_1_quote = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Testimonial 1 Quote")
    testimonial_1_author = forms.CharField(max_length=100, required=False, label="Testimonial 1 Author")
    testimonial_2_quote = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Testimonial 2 Quote")
    testimonial_2_author = forms.CharField(max_length=100, required=False, label="Testimonial 2 Author")
    testimonial_3_quote = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Testimonial 3 Quote")
    testimonial_3_author = forms.CharField(max_length=100, required=False, label="Testimonial 3 Author")

    # ── Gallery ──
    gallery_image_1 = forms.ImageField(required=False, label="Gallery Image 1", widget=JSONImageWidget)
    gallery_image_2 = forms.ImageField(required=False, label="Gallery Image 2", widget=JSONImageWidget)
    gallery_image_3 = forms.ImageField(required=False, label="Gallery Image 3", widget=JSONImageWidget)
    gallery_image_4 = forms.ImageField(required=False, label="Gallery Image 4", widget=JSONImageWidget)
    gallery_image_5 = forms.ImageField(required=False, label="Gallery Image 5", widget=JSONImageWidget)

    # ── Contact ──
    contact_address_line_1 = forms.CharField(max_length=200, required=False, label="Address Line 1")
    contact_address_line_2 = forms.CharField(max_length=200, required=False, label="Address Line 2")
    contact_phone = forms.CharField(max_length=30, required=False, label="Phone")
    contact_email = forms.EmailField(required=False, label="Email")
    contact_whatsapp = forms.CharField(max_length=30, required=False, label="WhatsApp")
    contact_map_embed_url = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Map Embed URL")
    contact_hours_1_day = forms.CharField(max_length=50, required=False, label="Hours 1 Day")
    contact_hours_1_hours = forms.CharField(max_length=30, required=False, label="Hours 1 Times")
    contact_hours_2_day = forms.CharField(max_length=50, required=False, label="Hours 2 Day")
    contact_hours_2_hours = forms.CharField(max_length=30, required=False, label="Hours 2 Times")
    contact_hours_3_day = forms.CharField(max_length=50, required=False, label="Hours 3 Day")
    contact_hours_3_hours = forms.CharField(max_length=30, required=False, label="Hours 3 Times")

    # ── About Page ──
    about_description = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False, label="About Description")
    about_image = forms.ImageField(required=False, label="About Section Image", widget=JSONImageWidget)
    about_card_1_title = forms.CharField(max_length=100, required=False, label="Card 1 Title")
    about_card_1_body = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Card 1 Body")
    about_card_2_title = forms.CharField(max_length=100, required=False, label="Card 2 Title")
    about_card_2_body = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Card 2 Body")
    about_card_3_title = forms.CharField(max_length=100, required=False, label="Card 3 Title")
    about_card_3_body = forms.CharField(widget=forms.Textarea(attrs={"rows": 2}), required=False, label="Card 3 Body")

    # ── Members Page ──
    members_description = forms.CharField(widget=forms.Textarea(attrs={"rows": 3}), required=False, label="Members Description")
    members_benefit_1_title = forms.CharField(max_length=100, required=False, label="Benefit 1 Title")
    members_benefit_1_desc = forms.CharField(max_length=300, required=False, label="Benefit 1 Description")
    members_benefit_2_title = forms.CharField(max_length=100, required=False, label="Benefit 2 Title")
    members_benefit_2_desc = forms.CharField(max_length=300, required=False, label="Benefit 2 Description")
    members_benefit_3_title = forms.CharField(max_length=100, required=False, label="Benefit 3 Title")
    members_benefit_3_desc = forms.CharField(max_length=300, required=False, label="Benefit 3 Description")
    members_benefit_4_title = forms.CharField(max_length=100, required=False, label="Benefit 4 Title")
    members_benefit_4_desc = forms.CharField(max_length=300, required=False, label="Benefit 4 Description")


def _safe_list_item(lst, index, key, default=""):
    """Safely extract a value from a list of dicts."""
    if lst and len(lst) > index and isinstance(lst[index], dict):
        return lst[index].get(key, default) or default
    return default


class FrontendSettingsAdmin(BaseModelAdmin):
    """Homepage settings admin with structured tabbed form fields."""

    list_display = ("__str__", "updated_at")
    ordering = ("-updated_at",)

    class Media:
        js = (
            'admin/js/vendor/jquery/jquery.js',
            'admin/js/jquery.init.js',
            'admin/js/core.js',
            'admin/js/prepopulate_init.js',
            'admin/js/change_form.js',
        )

    fieldsets = (
        ("Brand", {"fields": ("brand_name", "brand_tagline"), "classes": ("tab-brand",)}),
        ("Hero Section", {"fields": (
            "hero_eyebrow", "hero_title_prefix", "hero_title_emphasis",
            "hero_title_suffix", "hero_description", "hero_bg_image",
        )}),
        ("Stats Bar", {"fields": ("stat_years_serving", "stat_menu_items", "stat_rating")}),
        ("Our Story", {"fields": (
            "story_quote", "story_description",
            "about_feature_1_title", "about_feature_1_desc",
            "about_feature_2_title", "about_feature_2_desc",
            "about_feature_3_title", "about_feature_3_desc",
        )}),
        ("Why Us", {"fields": (
            "why_1_title", "why_1_desc",
            "why_2_title", "why_2_desc",
            "why_3_title", "why_3_desc",
            "why_4_title", "why_4_desc",
        )}),
        ("Reservation Banner", {"fields": (
            "reservation_banner_title", "reservation_banner_emphasis",
            "reservation_banner_description", "reservation_bg_image",
        )}),
        ("Testimonials", {"fields": (
            "testimonial_1_quote", "testimonial_1_author",
            "testimonial_2_quote", "testimonial_2_author",
            "testimonial_3_quote", "testimonial_3_author",
        )}),
        ("Gallery Images", {
            "fields": (
                "gallery_image_1", "gallery_image_2", "gallery_image_3",
                "gallery_image_4", "gallery_image_5",
            ),
            "description": "Upload new images to replace the current ones. Current images are shown if available.",
        }),
        ("Contact Info", {"fields": (
            "contact_address_line_1", "contact_address_line_2",
            "contact_phone", "contact_email", "contact_whatsapp",
            "contact_map_embed_url",
            "contact_hours_1_day", "contact_hours_1_hours",
            "contact_hours_2_day", "contact_hours_2_hours",
            "contact_hours_3_day", "contact_hours_3_hours",
        )}),
        ("About Page", {"fields": (
            "about_description", "about_image",
            "about_card_1_title", "about_card_1_body",
            "about_card_2_title", "about_card_2_body",
            "about_card_3_title", "about_card_3_body",
        )}),
        ("Members Page", {"fields": (
            "members_description",
            "members_benefit_1_title", "members_benefit_1_desc",
            "members_benefit_2_title", "members_benefit_2_desc",
            "members_benefit_3_title", "members_benefit_3_desc",
            "members_benefit_4_title", "members_benefit_4_desc",
        )}),
    )

    def get_form(self, request, obj=None, **kwargs):
        return FrontendSettingsForm

    def get_fieldsets(self, request, obj=None):
        return self.fieldsets

    def get_object(self, request, object_id, from_field=None):
        return FrontendSettings.get_solo()

    def get_initial(self, obj):
        """Extract JSON blob values into flat form initial data."""
        content = obj.resolved_content() if obj else {}
        home = content.get("home", {})
        contact = content.get("contact", {})
        about = content.get("about", {})
        members = content.get("members", {})
        stats = home.get("stats", {})
        features = home.get("about_features", [])
        why_items = home.get("why_items", [])
        testimonials = home.get("testimonials", [])
        gallery = home.get("gallery_images", [])
        hours = contact.get("opening_hours", [])
        about_cards = about.get("cards", [])
        benefits = members.get("benefits", [])

        return {
            "brand_name": content.get("brand_name", ""),
            "brand_tagline": content.get("brand_tagline", ""),
            "hero_eyebrow": home.get("hero_eyebrow", ""),
            "hero_title_prefix": home.get("hero_title_prefix", ""),
            "hero_title_emphasis": home.get("hero_title_emphasis", ""),
            "hero_title_suffix": home.get("hero_title_suffix", ""),
            "hero_description": home.get("hero_description", ""),
            "hero_bg_image": home.get("hero_bg_image", ""),
            "stat_years_serving": stats.get("years_serving", ""),
            "stat_menu_items": stats.get("menu_items", ""),
            "stat_rating": stats.get("rating", ""),
            "story_quote": home.get("story_quote", ""),
            "story_description": home.get("story_description", ""),
            "about_feature_1_title": _safe_list_item(features, 0, "title"),
            "about_feature_1_desc": _safe_list_item(features, 0, "description"),
            "about_feature_2_title": _safe_list_item(features, 1, "title"),
            "about_feature_2_desc": _safe_list_item(features, 1, "description"),
            "about_feature_3_title": _safe_list_item(features, 2, "title"),
            "about_feature_3_desc": _safe_list_item(features, 2, "description"),
            "why_1_title": _safe_list_item(why_items, 0, "title"),
            "why_1_desc": _safe_list_item(why_items, 0, "description"),
            "why_2_title": _safe_list_item(why_items, 1, "title"),
            "why_2_desc": _safe_list_item(why_items, 1, "description"),
            "why_3_title": _safe_list_item(why_items, 2, "title"),
            "why_3_desc": _safe_list_item(why_items, 2, "description"),
            "why_4_title": _safe_list_item(why_items, 3, "title"),
            "why_4_desc": _safe_list_item(why_items, 3, "description"),
            "reservation_banner_title": home.get("reservation_banner_title", ""),
            "reservation_banner_emphasis": home.get("reservation_banner_emphasis", ""),
            "reservation_banner_description": home.get("reservation_banner_description", ""),
            "reservation_bg_image": home.get("reservation_bg_image", ""),
            "testimonial_1_quote": _safe_list_item(testimonials, 0, "quote"),
            "testimonial_1_author": _safe_list_item(testimonials, 0, "author"),
            "testimonial_2_quote": _safe_list_item(testimonials, 1, "quote"),
            "testimonial_2_author": _safe_list_item(testimonials, 1, "author"),
            "testimonial_3_quote": _safe_list_item(testimonials, 2, "quote"),
            "testimonial_3_author": _safe_list_item(testimonials, 2, "author"),
            "gallery_image_1": gallery[0] if len(gallery) > 0 else "",
            "gallery_image_2": gallery[1] if len(gallery) > 1 else "",
            "gallery_image_3": gallery[2] if len(gallery) > 2 else "",
            "gallery_image_4": gallery[3] if len(gallery) > 3 else "",
            "gallery_image_5": gallery[4] if len(gallery) > 4 else "",
            "about_image": home.get("about_image", ""),
            "contact_address_line_1": contact.get("address_line_1", ""),
            "contact_address_line_2": contact.get("address_line_2", ""),
            "contact_phone": contact.get("phone", ""),
            "contact_email": contact.get("email", ""),
            "contact_whatsapp": contact.get("whatsapp", ""),
            "contact_map_embed_url": contact.get("map_embed_url", ""),
            "contact_hours_1_day": _safe_list_item(hours, 0, "day"),
            "contact_hours_1_hours": _safe_list_item(hours, 0, "hours"),
            "contact_hours_2_day": _safe_list_item(hours, 1, "day"),
            "contact_hours_2_hours": _safe_list_item(hours, 1, "hours"),
            "contact_hours_3_day": _safe_list_item(hours, 2, "day"),
            "contact_hours_3_hours": _safe_list_item(hours, 2, "hours"),
            "about_description": about.get("description", ""),
            "about_card_1_title": _safe_list_item(about_cards, 0, "title"),
            "about_card_1_body": _safe_list_item(about_cards, 0, "body"),
            "about_card_2_title": _safe_list_item(about_cards, 1, "title"),
            "about_card_2_body": _safe_list_item(about_cards, 1, "body"),
            "about_card_3_title": _safe_list_item(about_cards, 2, "title"),
            "about_card_3_body": _safe_list_item(about_cards, 2, "body"),
            "members_description": members.get("description", ""),
            "members_benefit_1_title": _safe_list_item(benefits, 0, "title"),
            "members_benefit_1_desc": _safe_list_item(benefits, 0, "description"),
            "members_benefit_2_title": _safe_list_item(benefits, 1, "title"),
            "members_benefit_2_desc": _safe_list_item(benefits, 1, "description"),
            "members_benefit_3_title": _safe_list_item(benefits, 2, "title"),
            "members_benefit_3_desc": _safe_list_item(benefits, 2, "description"),
            "members_benefit_4_title": _safe_list_item(benefits, 3, "title"),
            "members_benefit_4_desc": _safe_list_item(benefits, 3, "description"),
        }

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        obj = FrontendSettings.get_solo()
        FormClass = self.get_form(request, obj)

        if request.method == "POST":
            form = FormClass(request.POST, request.FILES)
            if form.is_valid():
                self._save_form_to_json(obj, form.cleaned_data, form.initial)
                self.message_user(request, "Homepage settings saved successfully.")
                from django.http import HttpResponseRedirect
                return HttpResponseRedirect(request.path)
        else:
            form = FormClass(initial=self.get_initial(obj))

        fieldsets = self.get_fieldsets(request, obj)
        admin_form = admin.helpers.AdminForm(form, fieldsets, {}, model_admin=self)

        context = {
            **self.admin_site.each_context(request),
            "title": "Edit Homepage Settings",
            "adminform": admin_form,
            "media": self.media + form.media,
            "form": form,
            "opts": self.model._meta,
            "original": obj,
            "is_popup": False,
            "save_as": False,
            "has_delete_permission": False,
            "has_add_permission": False,
            "has_change_permission": True,
            "has_view_permission": True,
            "has_editable_inline_admin_formsets": False,
            "inline_admin_formsets": [],
            "show_save": True,
            "show_save_and_continue": False,
            "show_save_and_add_another": False,
        }
        if extra_context:
            context.update(extra_context)
        return self.render_change_form(request, context, change=True, obj=obj)

    def _save_form_to_json(self, obj, data, initial_data):
        """Reassemble form field values into the FrontendSettings JSON blob."""
        from django.core.files.storage import default_storage
        import os
        from uuid import uuid4

        def handle_image(field_name):
            file_obj = data.get(field_name)
            if hasattr(file_obj, 'file'):
                ext = os.path.splitext(file_obj.name)[1]
                filename = f"frontend/{uuid4().hex}{ext}"
                saved_path = default_storage.save(filename, file_obj)
                return default_storage.url(saved_path)
            return initial_data.get(field_name, "")

        def _build_list(prefix, count, keys):
            result = []
            for i in range(1, count + 1):
                item = {}
                for key in keys:
                    field_name = f"{prefix}_{i}_{key}"
                    item[key] = data.get(field_name, "")
                if any(item.values()):
                    result.append(item)
            return result

        content = {
            "brand_name": data.get("brand_name", ""),
            "brand_tagline": data.get("brand_tagline", ""),
            "contact": {
                "address_line_1": data.get("contact_address_line_1", ""),
                "address_line_2": data.get("contact_address_line_2", ""),
                "phone": data.get("contact_phone", ""),
                "email": data.get("contact_email", ""),
                "whatsapp": data.get("contact_whatsapp", ""),
                "map_embed_url": data.get("contact_map_embed_url", ""),
                "opening_hours": _build_list("contact_hours", 3, ["day", "hours"]),
            },
            "home": {
                "hero_eyebrow": data.get("hero_eyebrow", ""),
                "hero_title_prefix": data.get("hero_title_prefix", ""),
                "hero_title_emphasis": data.get("hero_title_emphasis", ""),
                "hero_title_suffix": data.get("hero_title_suffix", ""),
                "hero_description": data.get("hero_description", ""),
                "hero_bg_image": handle_image("hero_bg_image"),
                "story_quote": data.get("story_quote", ""),
                "story_description": data.get("story_description", ""),
                "about_features": _build_list("about_feature", 3, ["title", "desc"]),
                "why_items": _build_list("why", 4, ["title", "desc"]),
                "stats": {
                    "years_serving": data.get("stat_years_serving", ""),
                    "menu_items": data.get("stat_menu_items", ""),
                    "rating": data.get("stat_rating", ""),
                },
                "reservation_banner_title": data.get("reservation_banner_title", ""),
                "reservation_banner_emphasis": data.get("reservation_banner_emphasis", ""),
                "reservation_banner_description": data.get("reservation_banner_description", ""),
                "reservation_bg_image": handle_image("reservation_bg_image"),
                "testimonials": _build_list("testimonial", 3, ["quote", "author"]),
                "gallery_images": [
                    handle_image("gallery_image_1"),
                    handle_image("gallery_image_2"),
                    handle_image("gallery_image_3"),
                    handle_image("gallery_image_4"),
                    handle_image("gallery_image_5"),
                ],
                "about_image": handle_image("about_image"),
            },
            "about": {
                "description": data.get("about_description", ""),
                "cards": _build_list("about_card", 3, ["title", "body"]),
            },
            "members": {
                "description": data.get("members_description", ""),
                "benefits": _build_list("members_benefit", 4, ["title", "desc"]),
            },
        }

        # Remap 'desc' keys back to 'description' for content sections that use it
        for feature in content["home"]["about_features"]:
            if "desc" in feature:
                feature["description"] = feature.pop("desc")
        for item in content["home"]["why_items"]:
            if "desc" in item:
                item["description"] = item.pop("desc")
        for benefit in content["members"]["benefits"]:
            if "desc" in benefit:
                benefit["description"] = benefit.pop("desc")

        obj.content = content
        obj.save()

    def has_add_permission(self, request):
        return not FrontendSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        """Redirect list view to change form for singleton pattern."""
        obj = FrontendSettings.get_solo()
        from django.http import HttpResponseRedirect
        from django.urls import reverse
        return HttpResponseRedirect(
            reverse(f"{self.admin_site.name}:{obj._meta.app_label}_{obj._meta.model_name}_change", args=[obj.pk])
        )


custom_admin_site.register(User, UserAdmin)
custom_admin_site.register(Group, GroupAdmin)
custom_admin_site.register(MenuItem, MenuItemAdmin)
custom_admin_site.register(Table, TableAdmin)
custom_admin_site.register(Reservation, ReservationAdmin)
custom_admin_site.register(Review, ReviewAdmin)
custom_admin_site.register(Order, OrderAdmin)
custom_admin_site.register(AdminNotification, AdminNotificationAdmin)
custom_admin_site.register(FrontendSettings, FrontendSettingsAdmin)
custom_admin_site.register(StaffMember, StaffMemberAdmin)


class LogEntryAdmin(BaseModelAdmin):
    """Read-only view of Django's internal audit logs."""

    list_display = (
        "action_time",
        "user",
        "content_type",
        "object_repr",
        "action_flag_display",
        "change_message",
    )
    list_filter = ("action_flag", "content_type", "action_time")
    search_fields = ("object_repr", "change_message", "user__username")
    ordering = ("-action_time",)
    readonly_fields = (
        "action_time",
        "user",
        "content_type",
        "object_id",
        "object_repr",
        "action_flag",
        "change_message",
    )

    @admin.display(description="Action")
    def action_flag_display(self, obj):
        from django.contrib.admin.models import ADDITION, CHANGE, DELETION
        if obj.action_flag == ADDITION:
            return status_badge("yes")
        if obj.action_flag == CHANGE:
            return status_badge("warning")
        if obj.action_flag == DELETION:
            return status_badge("no")
        return "Unknown"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


custom_admin_site.register(LogEntry, LogEntryAdmin)
