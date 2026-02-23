"""Smoke tests that validate key API routes and core reservation behavior."""
from datetime import timedelta

import pytest
from django.utils import timezone

from api.models import MenuItem, Reservation


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
