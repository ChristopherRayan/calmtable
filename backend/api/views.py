"""REST API views for auth, menu, reservations, reviews, orders, and analytics."""
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models.functions import TruncDate

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .filters import MenuItemFilter
from .models import (
    AdminNotification,
    FrontendSettings,
    MenuItem,
    Order,
    OrderItem,
    Reservation,
    Review,
    StaffMember,
    UserProfile,
)
from .serializers import (
    AdminNotificationSerializer,
    FrontendSettingsSerializer,
    LoginSerializer,
    MenuItemSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    ReservationSerializer,
    ReviewSerializer,
    StaffMemberSerializer,
    TableSerializer,
    UserProfileUpdateSerializer,
    UserPublicSerializer,
    UserRegisterSerializer,
)

User = get_user_model()


def build_customer_display_name(user):
    """Return customer-facing display name from user profile data."""
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.username or user.email


def create_admin_order_notifications(order: Order):
    """Create notifications for staff and customer when an order is placed."""
    customer = order.customer
    profile = getattr(customer, "profile", None) if customer else None
    customer_phone = profile.phone if profile else ""
    customer_name = order.customer_name or (build_customer_display_name(customer) if customer else "Guest")
    customer_email = order.customer_email

    items = list(order.items.select_related("menu_item").all())
    items_preview = ", ".join(f"{item.quantity}x {item.item_name or (item.menu_item.name if item.menu_item else 'Item')}" for item in items[:5])
    if len(items) > 5:
        items_preview = f"{items_preview}, +{len(items) - 5} more"

    payload = {
        "order_id": order.id,
        "order_number": order.order_number,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone,
        "total_amount": str(order.total_amount),
        "status": order.status,
        "items": [
            {
                "menu_item_id": item.menu_item_id,
                "menu_item_name": item.item_name or (item.menu_item.name if item.menu_item else ""),
                "quantity": item.quantity,
                "line_total": str(item.subtotal),
            }
            for item in items
        ],
    }

    message = (
        f"New order #{order.order_number} from {customer_name} ({customer_email})"
        f"{f', {customer_phone}' if customer_phone else ''}. "
        f"Total: MK {order.total_amount:,.0f}. Items: {items_preview or 'N/A'}."
    )

    admins = User.objects.filter(is_staff=True, is_active=True).only("id")
    notifications = [
        AdminNotification(
            recipient=admin_user,
            order=order,
            title="New Customer Order",
            message=message,
            notif_type=AdminNotification.Type.NEW_ORDER,
            payload=payload,
        )
        for admin_user in admins
    ]
    if customer and customer.is_active:
        notifications.append(
            AdminNotification(
                recipient=customer,
                order=order,
                title="Order Received",
                message=f"Your order #{order.order_number} has been received. We are preparing it now.",
                notif_type=AdminNotification.Type.STATUS_UPDATE,
                payload=payload,
            )
        )

    if notifications:
        AdminNotification.objects.bulk_create(notifications)


def create_admin_reservation_notifications(reservation: Reservation):
    """Create notifications for staff when a new reservation is made."""
    admins = User.objects.filter(is_staff=True, is_active=True).only("id")
    message = (
        f"New reservation from {reservation.name} for {reservation.party_size} guests "
        f"on {reservation.date} at {reservation.time_slot}. "
        f"Confirmation: {reservation.confirmation_code}."
    )

    notifications = [
        AdminNotification(
            recipient=admin_user,
            reservation=reservation,
            title="New Table Reservation",
            message=message,
            notif_type=AdminNotification.Type.RESERVATION,
            link_url=f"/reservation/{reservation.confirmation_code}",
        )
        for admin_user in admins
    ]
    if notifications:
        AdminNotification.objects.bulk_create(notifications)


class IsOwnerOrStaff(permissions.BasePermission):
    """Object-level permission allowing owners or staff members."""

    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.user_id == request.user.id


class IsCustomer(permissions.BasePermission):
    """Permission allowing only authenticated non-staff users."""

    message = "Customer account required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and not request.user.is_staff)


class IsChef(permissions.BasePermission):
    """Permission for users with the chef role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or getattr(request.user, "profile", None) and request.user.profile.role == "chef")
        )


class RegisterAPIView(APIView):
    """Register a new user account and issue JWT tokens."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserPublicSerializer(user, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    """Authenticate a user and issue JWT tokens."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserPublicSerializer(user, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        )


class LogoutAPIView(APIView):
    """Blacklist refresh token on user logout."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            raise ValidationError({"refresh": "Refresh token is required."})

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            raise ValidationError({"refresh": "Invalid refresh token."}) from exc

        return Response(status=status.HTTP_205_RESET_CONTENT)


class AdminSSOView(APIView):
    """Single Sign-On view for staff accessing Django admin from frontend.
    
    Accepts a JWT token and creates a Django session for admin access.
    Redirects to Django admin on success.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token_str = request.query_params.get("token")
        if not token_str:
            return HttpResponseRedirect("/admin/login/")

        try:
            # Validate JWT token
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token_str)
            user = jwt_auth.get_user(validated_token)
        except AuthenticationFailed:
            return HttpResponseRedirect("/admin/login/")
        except Exception:
            return HttpResponseRedirect("/admin/login/")

        # Check if user is staff
        if not user or not user.is_staff:
            return HttpResponseRedirect("/admin/login/")

        # Create a Django session for this user
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")

        # Redirect to Django admin
        return HttpResponseRedirect("/admin/")


class MeAPIView(APIView):
    """Return profile details for the current authenticated user."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get(self, request):
        return Response(UserPublicSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserPublicSerializer(user, context={"request": request}).data)


class MyReservationsAPIView(APIView):
    """Return reservation history for current authenticated customer."""

    permission_classes = [IsCustomer]

    def get(self, request):
        queryset = Reservation.objects.filter(
            Q(user=request.user) | Q(email__iexact=request.user.email)
        ).order_by("-created_at")
        serializer = ReservationSerializer(queryset, many=True)
        return Response(serializer.data)


class FrontendSettingsAPIView(APIView):
    """Public endpoint for frontend-editable CMS settings."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @method_decorator(cache_page(60))
    def get(self, request):
        settings_obj = FrontendSettings.get_solo()
        serializer = FrontendSettingsSerializer(settings_obj)
        return Response(serializer.data)


@method_decorator(cache_page(60), name="list")
class MenuItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only endpoints for menu listing and details."""

    authentication_classes = []
    serializer_class = MenuItemSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = MenuItemFilter

    def get_queryset(self):
        queryset = MenuItem.objects.annotate(average_rating=Avg("reviews__rating"))
        if self.action in ("list", "featured"):
            queryset = queryset.filter(is_available=True)
        return queryset

    @method_decorator(cache_page(60))
    @action(detail=False, methods=["get"], url_path="featured")
    def featured(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(is_featured=True))
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @method_decorator(cache_page(60))
    @action(detail=False, methods=["get"], url_path="best-ordered")
    def best_ordered(self, request):
        ordered_count_annotation = Coalesce(
            Sum(
                "order_items__quantity",
                filter=Q(order_items__order__status__in=[
                    Order.Status.CONFIRMED,
                    Order.Status.PREPARING,
                    Order.Status.READY,
                    Order.Status.COMPLETED,
                ]),
            ),
            0,
        )
        base_queryset = self.filter_queryset(
            self.get_queryset().filter(is_available=True).annotate(ordered_count=ordered_count_annotation)
        )
        top_items = list(base_queryset.filter(ordered_count__gt=0).order_by("-ordered_count", "name")[:10])
        if not top_items:
            top_items = list(base_queryset.filter(is_featured=True)[:10])

        serializer = self.get_serializer(top_items, many=True)
        return Response(serializer.data)


class ReservationViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Create reservation and retrieve it by confirmation code."""

    serializer_class = ReservationSerializer
    queryset = Reservation.objects.all()
    lookup_field = "confirmation_code"

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsCustomer()]
        return [permissions.AllowAny()]

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        code = self.kwargs.get(self.lookup_field, "").upper()
        return get_object_or_404(queryset, **{self.lookup_field: code})

    def perform_create(self, serializer):
        reservation = serializer.save()
        create_admin_reservation_notifications(reservation)


class ReviewViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """List, create, and delete menu item reviews."""

    serializer_class = ReviewSerializer

    def get_queryset(self):
        queryset = Review.objects.select_related("user", "menu_item")
        menu_item_id = self.request.query_params.get("menu_item")
        if menu_item_id:
            queryset = queryset.filter(menu_item_id=menu_item_id)
        return queryset

    def get_permissions(self):
        if self.action in ("list",):
            return [permissions.AllowAny()]
        if self.action in ("create",):
            return [permissions.IsAuthenticated(), IsCustomer()]
        if self.action in ("destroy",):
            return [permissions.IsAuthenticated(), IsOwnerOrStaff()]
        return [permissions.IsAuthenticated()]


@method_decorator(cache_page(20), name="get")
class AvailableSlotsAPIView(APIView):
    """Return open hours range for reservations (instead of predefined slots)."""

    authentication_classes = []

    def get(self, request):
        date_value = request.query_params.get("date")
        if not date_value:
            return Response({"detail": "Query parameter 'date' is required."}, status=status.HTTP_400_BAD_REQUEST)

        target_date = parse_date(date_value)
        if not target_date:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        now_local = timezone.localtime(timezone.now())
        if target_date < now_local.date():
            return Response(
                {
                    "date": target_date.isoformat(),
                    "open_hour": settings.RESERVATION_OPEN_HOUR,
                    "close_hour": settings.RESERVATION_CLOSE_HOUR,
                    "is_past": True,
                }
            )

        return Response(
            {
                "date": target_date.isoformat(),
                "open_hour": settings.RESERVATION_OPEN_HOUR,
                "close_hour": settings.RESERVATION_CLOSE_HOUR,
                "is_past": target_date < now_local.date(),
            }
        )


@method_decorator(cache_page(20), name="get")
class AvailableTablesAPIView(APIView):
    """Return available tables for a given date, time, party size, and duration."""

    authentication_classes = []

    def get(self, request):
        from datetime import datetime as dt
        from .models import Table

        date_value = request.query_params.get("date")
        time_value = request.query_params.get("time")
        party_size = request.query_params.get("party_size")
        duration_hours = request.query_params.get("duration", 2)

        if not all([date_value, time_value, party_size]):
            return Response(
                {"detail": "Query parameters 'date', 'time', and 'party_size' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_date = parse_date(date_value)
        if not target_date:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            time_slot = dt.strptime(time_value, "%H:%M").time()
        except ValueError:
            return Response(
                {"detail": "Invalid time format. Use HH:MM."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            party_size = int(party_size)
            duration_hours = int(duration_hours)
        except (ValueError, TypeError):
            return Response(
                {"detail": "party_size and duration must be integers."}, status=status.HTTP_400_BAD_REQUEST
            )

        if party_size < 1 or party_size > 20:
            return Response(
                {"detail": "Party size must be between 1 and 20."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get all active tables that can fit the party
        tables = Table.objects.filter(is_active=True, capacity__gte=party_size).order_by("table_number")

        available_tables = []
        for table in tables:
            if table.is_available_for_slot(target_date, time_slot, duration_hours):
                from .serializers import TableSerializer
                available_tables.append(TableSerializer(table).data)

        return Response(
            {
                "date": target_date.isoformat(),
                "time": time_value,
                "party_size": party_size,
                "duration_hours": duration_hours,
                "available_tables": available_tables,
                "total_available": len(available_tables),
            }
        )


class IsManager(permissions.BasePermission):
    """Permission allowing only users with 'manager' role in their profile."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        return profile and profile.role == "manager"


class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Create orders and list/retrieve customer order history."""

    serializer_class = OrderSerializer
    queryset = Order.objects.prefetch_related("items", "items__menu_item")

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsCustomer()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Staff users see all orders
        if self.request.user.is_staff:
            return self.queryset
        # Managers see all orders
        profile = getattr(self.request.user, 'profile', None)
        if profile and profile.role == 'manager':
            return self.queryset
        # Regular users see only their own orders
        return self.queryset.filter(customer=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        create_admin_order_notifications(order)
        response_data = OrderSerializer(order).data
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="place", permission_classes=[permissions.IsAuthenticated, IsCustomer])
    def place(self, request):
        """Checkout endpoint returning compact payload for menu/cart flows."""
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        create_admin_order_notifications(order)
        return Response(
            {
                "success": True,
                "order_number": order.order_number,
                "total": float(order.total_amount),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="my", permission_classes=[permissions.IsAuthenticated, IsCustomer])
    def my_orders(self, request):
        serializer = self.get_serializer(self.get_queryset().filter(customer=request.user), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="assign", permission_classes=[permissions.IsAuthenticated, IsManager])
    def assign(self, request, pk=None):
        """Assign an order to a chef and set status to ASSIGNED."""
        order = self.get_object()
        
        # Validate order is in a valid state for assignment
        if order.status in [Order.Status.COMPLETED, Order.Status.CANCELLED]:
            return Response(
                {"detail": "Cannot assign completed or cancelled orders."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        chef_id = request.data.get("chef_id")
        if not chef_id:
            return Response({"detail": "chef_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate chef exists and has chef role
        try:
            chef = User.objects.select_related("profile").get(pk=chef_id, profile__role="chef", is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "Invalid or inactive chef."}, status=status.HTTP_400_BAD_REQUEST)

        order.assigned_chef = chef
        order.status = Order.Status.ASSIGNED
        order.save(update_fields=["assigned_chef", "status", "updated_at"])

        # Notify the chef
        AdminNotification.objects.create(
            recipient=chef,
            order=order,
            title="Order Assigned",
            message=f"You have been assigned order #{order.order_number}.",
            notif_type=AdminNotification.Type.STATUS_UPDATE,
        )

        return Response(OrderSerializer(order).data)


class OrderReceiptAPIView(APIView):
    """Generate receipt PDF for order owners and staff."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_number):
        order = get_object_or_404(Order.objects.prefetch_related("items", "items__menu_item"), order_number=order_number)
        if not request.user.is_staff and order.customer_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)

        from .pdf import generate_receipt_pdf

        buffer = generate_receipt_pdf(order)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="CalmTable-Receipt-{order.order_number}.pdf"'
        return response


class AdminNotificationViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """User notification feed and state updates."""

    authentication_classes = (SessionAuthentication, JWTAuthentication)
    serializer_class = AdminNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdminNotification.objects.filter(recipient=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().order_by("-created_at")[:30]
        serializer = self.get_serializer(queryset, many=True)
        unread = self.get_queryset().filter(is_read=False).count()
        return Response(
            {
                "unread": unread,
                "notifications": serializer.data,
            }
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})

    @action(detail=False, methods=["post"], url_path="read")
    def mark_all_read_alias(self, request):
        """Compatibility alias for clients using /notifications/read/."""
        return self.mark_all_read(request)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})


class StaffUserViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoints for Managers to view and manage restaurant staff."""

    serializer_class = UserPublicSerializer
    permission_classes = [IsManager]

    def get_queryset(self):
        return User.objects.filter(is_staff=True).exclude(is_superuser=True).select_related("profile")

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        # Prevent self-deactivation to avoid locking out admin access
        if user.id == request.user.id:
            return Response(
                {"detail": "Cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response({"id": user.id, "is_active": user.is_active})

    @action(detail=False, methods=["get"], url_path="chefs")
    def list_chefs(self):
        chefs = User.objects.filter(profile__role="chef", is_active=True).select_related("profile")
        serializer = self.get_serializer(chefs, many=True)
        return Response(serializer.data)


class ChangePasswordAPIView(APIView):
    """Allow users to change their password, clearing the 'must_change' flag."""

    permission_classes = [permissions.IsAuthenticated]

    # Common passwords to block
    COMMON_PASSWORDS = {
        "password", "12345678", "123456789", "password123", "admin123",
        "welcome", "qwerty", "abc123", "letmein", "monkey", "dragon",
    }

    def validate_password_strength(self, password: str) -> tuple[bool, str]:
        """Validate password meets strength requirements."""
        if password.lower() in self.COMMON_PASSWORDS:
            return False, "This password is too common. Please choose a stronger password."
        
        if len(password) < 8:
            return False, "Password must be at least 8 characters."
        
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        
        strength_score = sum([has_upper, has_lower, has_digit, has_special])
        
        if strength_score < 3:
            return False, "Password must contain at least 3 of: uppercase, lowercase, numbers, special characters."
        
        return True, ""

    def post(self, request):
        new_password = request.data.get("password")
        if not new_password:
            return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        is_valid, error_message = self.validate_password_strength(new_password)
        if not is_valid:
            return Response({"detail": error_message}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.set_password(new_password)
        user.save()

        # Update profile flag
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.must_change_password = False
        profile.save(update_fields=["must_change_password"])

        return Response({"detail": "Password updated successfully."})


class PublicMembersAPIView(APIView):
    """Public listing of staff members displayed on the website."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        members = StaffMember.objects.filter(is_active=True, display_on_website=True)
        payload = [
            {
                "id": member.id,
                "name": member.full_name,
                "role": member.get_role_display(),
                "photo": member.photo.url if member.photo else None,
                "bio": member.bio,
            }
            for member in members
        ]
        return Response({"members": payload})


class TableViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """API endpoints for managers to manage restaurant tables."""

    serializer_class = TableSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]

    def get_queryset(self):
        return Table.objects.all().order_by('table_number')

    def destroy(self, request, *args, **kwargs):
        table = self.get_object()
        # Check if table has active reservations
        active_reservations = Reservation.objects.filter(
            table=table,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED]
        )
        if active_reservations.exists():
            return Response(
                {"detail": "Cannot delete table with active reservations."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class AnalyticsAPIView(APIView):
    """Staff-only analytics payload for reservation and order insights."""

    authentication_classes = (SessionAuthentication, JWTAuthentication)
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.localdate()
        start_date = today - timedelta(days=29)

        todays_reservations = Reservation.objects.filter(date=today).count()
        total_revenue = (
            Order.objects.exclude(status=Order.Status.CANCELLED).aggregate(total=Sum("total_amount"))["total"]
            or Decimal("0.00")
        )

        top_dishes_queryset = (
            OrderItem.objects.select_related("menu_item")
            .values("menu_item_id", "menu_item__name")
            .annotate(total_quantity=Sum("quantity"))
            .order_by("-total_quantity")[:5]
        )

        reservation_counts = (
            Reservation.objects.filter(date__gte=start_date, date__lte=today)
            .values("date")
            .annotate(total=Count("id"))
            .order_by("date")
        )
        reservation_map = {entry["date"]: entry["total"] for entry in reservation_counts}
        reservation_volume = []
        for offset in range(30):
            day = start_date + timedelta(days=offset)
            reservation_volume.append({"date": day.isoformat(), "count": reservation_map.get(day, 0)})

        dish_volume = [
            {
                "menu_item_id": entry["menu_item_id"],
                "name": entry["menu_item__name"],
                "quantity": entry["total_quantity"],
            }
            for entry in top_dishes_queryset
        ]

        return Response(
            {
                "todays_reservations": todays_reservations,
                "total_revenue": str(total_revenue),
                "top_dishes": dish_volume,
                "reservation_volume": reservation_volume,
                "dish_volume": dish_volume,
            }
        )


class AnalyticsOrdersPerDayAPIView(APIView):
    """Staff-only chart payload for orders per day."""

    authentication_classes = (SessionAuthentication, JWTAuthentication)
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        since = timezone.now() - timedelta(days=30)
        qs = (
            Order.objects.filter(created_at__gte=since)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        return Response(
            {
                "labels": [str(row["date"]) for row in qs],
                "values": [row["count"] for row in qs],
            }
        )


class AnalyticsRevenueAPIView(APIView):
    """Staff-only chart payload for revenue trend."""

    authentication_classes = (SessionAuthentication, JWTAuthentication)
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        since = timezone.now() - timedelta(days=30)
        qs = (
            Order.objects.filter(created_at__gte=since)
            .exclude(status=Order.Status.CANCELLED)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(total=Sum("total_amount"))
            .order_by("date")
        )
        return Response(
            {
                "labels": [str(row["date"]) for row in qs],
                "values": [float(row["total"] or 0) for row in qs],
            }
        )


class StaffMemberViewSet(viewsets.ModelViewSet):
    """CRUD viewset for public staff member profiles managed by Managers."""

    queryset = StaffMember.objects.all()
    serializer_class = StaffMemberSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager]

    def get_queryset(self):
        return StaffMember.objects.all().order_by("role", "full_name")
