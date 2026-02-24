"""Smoke tests that validate key API routes and core reservation behavior."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from api.models import MenuItem, Order, OrderItem, Reservation

User = get_user_model()


@pytest.mark.django_db
def test_featured_menu_endpoint_returns_only_featured_available(client):
    """Featured endpoint returns available featured menu items only."""
    MenuItem.objects.create(
        name="Signature Tartare",
        description="Hand-cut beef tartare with capers and quail yolk.",
        price="14.50",
        category=MenuItem.Category.STARTERS,
        is_available=True,
        is_featured=True,
        dietary_tags=["gluten-free"],
    )
    MenuItem.objects.create(
        name="Hidden Special",
        description="Not featured item.",
        price="10.00",
        category=MenuItem.Category.STARTERS,
        is_available=True,
        is_featured=False,
        dietary_tags=[],
    )

    response = client.get("/api/menu/featured/")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["name"] == "Signature Tartare"


@pytest.mark.django_db
def test_best_ordered_endpoint_returns_items_ranked_by_paid_orders(client):
    """Best ordered endpoint prefers paid order volumes."""
    top_item = MenuItem.objects.create(
        name="Top Order",
        description="Most ordered menu dish.",
        price="14.50",
        category=MenuItem.Category.MAINS,
        is_available=True,
        is_featured=False,
        dietary_tags=[],
    )
    lower_item = MenuItem.objects.create(
        name="Lower Order",
        description="Less ordered menu dish.",
        price="10.00",
        category=MenuItem.Category.MAINS,
        is_available=True,
        is_featured=False,
        dietary_tags=[],
    )
    paid_order = Order.objects.create(email="customer@example.com", status=Order.Status.PAID)
    OrderItem.objects.create(order=paid_order, menu_item=top_item, quantity=3, unit_price=Decimal(top_item.price))
    OrderItem.objects.create(order=paid_order, menu_item=lower_item, quantity=1, unit_price=Decimal(lower_item.price))

    response = client.get("/api/menu/best-ordered/")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["id"] == top_item.id
    assert payload[0]["ordered_count"] >= payload[1]["ordered_count"]


@pytest.mark.django_db
def test_reservation_generates_confirmation_code():
    """Reservation save generates a unique uppercase 8-char confirmation code."""
    reservation = Reservation.objects.create(
        name="Jamie Smith",
        email="jamie@example.com",
        phone="+15551234567",
        date=timezone.localdate() + timedelta(days=1),
        time_slot=timezone.datetime.strptime("19:00", "%H:%M").time(),
        party_size=4,
        special_requests="Window seating preferred.",
    )

    assert reservation.confirmation_code
    assert len(reservation.confirmation_code) == 8
    assert reservation.confirmation_code.isalnum()


@pytest.mark.django_db
def test_anonymous_customer_actions_are_blocked(client):
    """Anonymous visitors must register/login before booking or checkout."""
    menu_item = MenuItem.objects.create(
        name="Customer-only Dish",
        description="Only authenticated customers can order.",
        price="10.00",
        category=MenuItem.Category.MAINS,
        is_available=True,
        dietary_tags=[],
    )

    tomorrow = timezone.localdate() + timedelta(days=1)
    reservation_payload = {
        "name": "Guest User",
        "email": "guest@example.com",
        "phone": "+15551234567",
        "date": tomorrow.isoformat(),
        "time_slot": "19:00",
        "party_size": 2,
        "special_requests": "",
    }
    reservation_response = client.post("/api/reservations/", reservation_payload, content_type="application/json")
    assert reservation_response.status_code == 401

    order_payload = {"items": [{"menu_item_id": menu_item.id, "quantity": 1}]}
    order_response = client.post("/api/orders/", order_payload, content_type="application/json")
    assert order_response.status_code == 401


@pytest.mark.django_db
def test_staff_role_is_blocked_from_customer_actions(client):
    """Staff users should not be allowed to create customer reservations, orders, or reviews."""
    staff_user = User.objects.create_user(
        username="staff1",
        email="staff1@example.com",
        password="password123",
        is_staff=True,
    )
    client.force_login(staff_user)

    menu_item = MenuItem.objects.create(
        name="Staff Block Dish",
        description="Staff should be blocked from customer flows.",
        price="12.00",
        category=MenuItem.Category.MAINS,
        is_available=True,
        dietary_tags=[],
    )

    tomorrow = timezone.localdate() + timedelta(days=1)
    reservation_payload = {
        "name": "Staff User",
        "email": "staff1@example.com",
        "phone": "+15557654321",
        "date": tomorrow.isoformat(),
        "time_slot": "19:30",
        "party_size": 2,
        "special_requests": "",
    }
    reservation_response = client.post("/api/reservations/", reservation_payload, content_type="application/json")
    assert reservation_response.status_code == 403

    order_payload = {"items": [{"menu_item_id": menu_item.id, "quantity": 1}]}
    order_response = client.post("/api/orders/", order_payload, content_type="application/json")
    assert order_response.status_code == 403

    review_payload = {"menu_item": menu_item.id, "rating": 5, "comment": "Great dish"}
    review_response = client.post("/api/reviews/", review_payload, content_type="application/json")
    assert review_response.status_code == 403
