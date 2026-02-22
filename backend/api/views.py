"""REST API views for menu, reservations, and slot availability."""
from datetime import datetime

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import MenuItemFilter
from .models import MenuItem, Reservation
from .serializers import MenuItemSerializer, ReservationSerializer


class MenuItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only endpoints for menu listing and details."""

    serializer_class = MenuItemSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = MenuItemFilter

    def get_queryset(self):
        queryset = MenuItem.objects.all()
        if self.action in ("list", "featured"):
            queryset = queryset.filter(is_available=True)
        return queryset

    @action(detail=False, methods=["get"], url_path="featured")
    def featured(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(is_featured=True))
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ReservationViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Create reservation and retrieve it by confirmation code."""

    serializer_class = ReservationSerializer
    queryset = Reservation.objects.all()
    lookup_field = "confirmation_code"

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        code = self.kwargs.get(self.lookup_field, "").upper()
        return get_object_or_404(queryset, **{self.lookup_field: code})


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
