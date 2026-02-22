"""Serializers for menu and reservation API payloads."""
from rest_framework import serializers

from .models import MenuItem, Reservation


class MenuItemSerializer(serializers.ModelSerializer):
    """Serializer for menu item responses."""

    class Meta:
        model = MenuItem
        fields = (
            "id",
            "name",
            "description",
            "price",
            "category",
            "image_url",
            "is_available",
            "is_featured",
            "dietary_tags",
            "created_at",
            "updated_at",
        )


class ReservationSerializer(serializers.ModelSerializer):
    """Serializer for reservation create and retrieve responses."""

    class Meta:
        model = Reservation
        fields = (
            "name",
            "email",
            "phone",
            "date",
            "time_slot",
            "party_size",
            "special_requests",
            "status",
            "confirmation_code",
            "created_at",
        )
        read_only_fields = ("status", "confirmation_code", "created_at")

    def create(self, validated_data):
        reservation = Reservation(**validated_data)
        reservation.save()
        return reservation
