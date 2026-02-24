"""REST API views for auth, menu, reservations, reviews, orders, and analytics."""
from datetime import datetime, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .filters import MenuItemFilter
from .models import MenuItem, Order, OrderItem, Reservation, Review
from .serializers import (
    LoginSerializer,
    MenuItemSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    ReservationSerializer,
    ReviewSerializer,
    UserProfileUpdateSerializer,
    UserPublicSerializer,
    UserRegisterSerializer,
)

User = get_user_model()


class IsOwnerOrStaff(permissions.BasePermission):
    """Object-level permission allowing owners or staff members."""

    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.user_id == request.user.id


class IsCustomer(permissions.BasePermission):
    """Permission allowing only authenticated non-staff users."""

    message = "Customer account required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and not request.user.is_staff)


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


@method_decorator(cache_page(60), name="list")
class MenuItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only endpoints for menu listing and details."""

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
                filter=Q(order_items__order__status=Order.Status.PAID),
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
    """Return available reservation slots for a given date."""

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
                    "available_slots": [],
                    "full_slots": [],
                    "max_reservations_per_slot": settings.MAX_RESERVATIONS_PER_SLOT,
                }
            )

        active_statuses = [Reservation.Status.PENDING, Reservation.Status.CONFIRMED]

        slot_counts = {
            slot: 0 for slot in settings.RESERVATION_TIME_SLOTS
        }
        reservations = Reservation.objects.filter(
            date=target_date,
            status__in=active_statuses,
        )
        for reservation in reservations:
            slot_label = reservation.time_slot.strftime("%H:%M")
            if slot_label in slot_counts:
                slot_counts[slot_label] += 1

        available_slots = []
        full_slots = []
        for slot in settings.RESERVATION_TIME_SLOTS:
            slot_time = datetime.strptime(slot, "%H:%M").time()

            if target_date == now_local.date() and slot_time <= now_local.time().replace(second=0, microsecond=0):
                continue

            if slot_counts.get(slot, 0) >= settings.MAX_RESERVATIONS_PER_SLOT:
                full_slots.append(slot)
            else:
                available_slots.append(slot)

        return Response(
            {
                "date": target_date.isoformat(),
                "available_slots": available_slots,
                "full_slots": full_slots,
                "max_reservations_per_slot": settings.MAX_RESERVATIONS_PER_SLOT,
            }
        )


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
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        client_secret = ""
        if settings.STRIPE_SECRET_KEY:
            try:
                import stripe
            except ImportError as exc:
                raise ValidationError("Stripe SDK is not installed on the server.") from exc

            stripe.api_key = settings.STRIPE_SECRET_KEY
            intent = stripe.PaymentIntent.create(
                amount=int(Decimal(order.total_amount) * Decimal("100")),
                currency=settings.STRIPE_CURRENCY,
                automatic_payment_methods={"enabled": True},
                metadata={"order_id": str(order.id)},
            )
            order.stripe_payment_intent_id = intent.id
            order.save(update_fields=["stripe_payment_intent_id", "updated_at"])
            client_secret = intent.client_secret
        elif settings.DEBUG:
            client_secret = f"test_client_secret_order_{order.id}"
        else:
            raise ValidationError("Stripe is not configured for this environment.")

        response_data = OrderSerializer(order).data
        response_data["client_secret"] = client_secret
        return Response(response_data, status=status.HTTP_201_CREATED)


class AnalyticsAPIView(APIView):
    """Staff-only analytics payload for reservation and order insights."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        today = timezone.localdate()
        start_date = today - timedelta(days=29)

        todays_reservations = Reservation.objects.filter(date=today).count()
        total_revenue = (
            Order.objects.filter(status=Order.Status.PAID).aggregate(total=Sum("total_amount"))["total"]
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
