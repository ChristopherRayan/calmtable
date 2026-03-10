"""Tests verifying that homepage images are surfaced and editable via FrontendSettings API."""

import pytest

from api.models import FrontendSettings


@pytest.mark.django_db
def test_frontend_settings_includes_image_fields(client):
    # hitting the endpoint should return all of the expected image keys with
    # fallback values present (even if the DB row has no explicit entries).
    response = client.get("/api/frontend-settings/")
    assert response.status_code == 200
    payload = response.json().get("content", {})
    home = payload.get("home", {})

    # defaults should match placeholder assets
    assert home.get("hero_bg_image", "").endswith("hero-placeholder.svg")
    assert home.get("about_image", "").endswith("hero-placeholder.png")
    assert home.get("reservation_bg_image", "").endswith("hero-placeholder.svg")


@pytest.mark.django_db
def test_admin_can_override_image_urls(client):
    # simulate editing via admin by writing to the JSON directly
    obj = FrontendSettings.get_solo()
    obj.content = {
        "home": {
            "hero_bg_image": "/media/custom-hero.jpg",
            "about_image": "https://cdn.example.com/about.png",
            "reservation_bg_image": "/media/res-banner.jpg",
        }
    }
    obj.save()

    response = client.get("/api/frontend-settings/")
    assert response.status_code == 200
    home = response.json()["content"]["home"]
    assert home["hero_bg_image"] == "/media/custom-hero.jpg"
    assert home["about_image"] == "https://cdn.example.com/about.png"
    assert home["reservation_bg_image"] == "/media/res-banner.jpg"
