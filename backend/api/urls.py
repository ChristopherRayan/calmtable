"""API URL declarations for auth, menu, reservations, reviews, orders, and analytics."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminNotificationViewSet,
    AnalyticsAPIView,
    AnalyticsOrdersPerDayAPIView,
    AnalyticsRevenueAPIView,
    AvailableSlotsAPIView,
    FrontendSettingsAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    MenuItemViewSet,
    MyReservationsAPIView,
    OrderViewSet,
    OrderReceiptAPIView,
    PublicMembersAPIView,
    RegisterAPIView,
    ReservationViewSet,
    ReviewViewSet,
)

router = DefaultRouter()
router.register("menu", MenuItemViewSet, basename="menu")
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("reviews", ReviewViewSet, basename="review")
router.register("orders", OrderViewSet, basename="order")
router.register("notifications", AdminNotificationViewSet, basename="admin-notification")

urlpatterns = [
    path("", include(router.urls)),
    path("frontend-settings/", FrontendSettingsAPIView.as_view(), name="frontend-settings"),
    path("available-slots/", AvailableSlotsAPIView.as_view(), name="available-slots"),
    path("orders/<str:order_number>/receipt/", OrderReceiptAPIView.as_view(), name="order-receipt"),
    path("members/", PublicMembersAPIView.as_view(), name="public-members"),
    path("auth/register/", RegisterAPIView.as_view(), name="auth-register"),
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", MeAPIView.as_view(), name="auth-me"),
    path("my-reservations/", MyReservationsAPIView.as_view(), name="my-reservations"),
    path("analytics/", AnalyticsAPIView.as_view(), name="analytics"),
    path("analytics/orders-per-day/", AnalyticsOrdersPerDayAPIView.as_view(), name="analytics-orders-per-day"),
    path("analytics/revenue/", AnalyticsRevenueAPIView.as_view(), name="analytics-revenue"),
]
