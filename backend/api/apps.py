"""Django app configuration for Calm Table API."""
from django.apps import AppConfig


class ApiConfig(AppConfig):
    """Application config for API app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "api"
