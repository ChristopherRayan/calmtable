"""API URL declarations for auth, menu, reservations, reviews, orders, and analytics."""
from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminNotificationViewSet,
    AdminSSOView,
    AnalyticsAPIView,
    AnalyticsOrdersPerDayAPIView,
    AnalyticsRevenueAPIView,
    AvailableSlotsAPIView,
    AvailableTablesAPIView,
    ChangePasswordAPIView,
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
    StaffUserViewSet,
    StaffMemberViewSet,
    TableViewSet,
)

router = DefaultRouter(trailing_slash=True)
router.register("menu", MenuItemViewSet, basename="menu")
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("reviews", ReviewViewSet, basename="review")
router.register("orders", OrderViewSet, basename="order")
router.register("notifications", AdminNotificationViewSet, basename="admin-notification")
router.register("staff/users", StaffUserViewSet, basename="staff-users")
router.register("staff/members", StaffMemberViewSet, basename="staff-members")
router.register("tables", TableViewSet, basename="tables")

urlpatterns = [
    path("", include(router.urls)),
    re_path(r"^frontend-settings/?$", FrontendSettingsAPIView.as_view(), name="frontend-settings"),
    re_path(r"^available-slots/?$", AvailableSlotsAPIView.as_view(), name="available-slots"),
    re_path(r"^available-tables/?$", AvailableTablesAPIView.as_view(), name="available-tables"),
    re_path(r"^orders/(?P<order_number>[^/.]+)/receipt/?$", OrderReceiptAPIView.as_view(), name="order-receipt"),
    re_path(r"^members/?$", PublicMembersAPIView.as_view(), name="public-members"),
    re_path(r"^auth/register/?$", RegisterAPIView.as_view(), name="auth-register"),
    re_path(r"^auth/login/?$", LoginAPIView.as_view(), name="auth-login"),
    re_path(r"^auth/login/admin/?$", AdminSSOView.as_view(), name="auth-admin-sso"),
    re_path(r"^auth/logout/?$", LogoutAPIView.as_view(), name="auth-logout"),
    re_path(r"^auth/refresh/?$", TokenRefreshView.as_view(), name="auth-refresh"),
    re_path(r"^auth/me/?$", MeAPIView.as_view(), name="auth-me"),
    re_path(r"^auth/change-password/?$", ChangePasswordAPIView.as_view(), name="auth-change-password"),
    re_path(r"^my-reservations/?$", MyReservationsAPIView.as_view(), name="my-reservations"),
    re_path(r"^analytics/?$", AnalyticsAPIView.as_view(), name="analytics"),
    re_path(r"^analytics/orders-per-day/?$", AnalyticsOrdersPerDayAPIView.as_view(), name="analytics-orders-per-day"),
    re_path(r"^analytics/revenue/?$", AnalyticsRevenueAPIView.as_view(), name="analytics-revenue"),
]
