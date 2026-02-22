"""API URL declarations for menu, reservations, and slot availability."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AvailableSlotsAPIView, MenuItemViewSet, ReservationViewSet

router = DefaultRouter()
router.register("menu", MenuItemViewSet, basename="menu")
router.register("reservations", ReservationViewSet, basename="reservation")

urlpatterns = [
    path("", include(router.urls)),
    path("available-slots/", AvailableSlotsAPIView.as_view(), name="available-slots"),
]
