"""Serializers for auth, menu, reservations, reviews, orders, and analytics."""
from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import AdminNotification, MenuItem, Order, OrderItem, Reservation, Review, UserProfile

User = get_user_model()


class UserPublicSerializer(serializers.ModelSerializer):
    """Public-facing user payload used in auth responses."""

    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "profile_image_url",
            "is_staff",
            "role",
        )

    def get_role(self, obj):
        return "admin" if obj.is_staff else "customer"

    def get_phone(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.phone if profile else ""

    def get_profile_image_url(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile or not profile.profile_image:
            return ""
        return profile.profile_image.url


class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for customer registration requests."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name")

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )


class LoginSerializer(serializers.Serializer):
    """Serializer for JWT login credentials."""

    email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs["email"].strip()
        password = attrs["password"]

        if not identifier:
            raise serializers.ValidationError("Email or username is required.")

        if "@" in identifier:
            user = User.objects.filter(email__iexact=identifier.lower()).first()
        else:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        authenticated_user = authenticate(
            request=self.context.get("request"),
            username=user.username,
            password=password,
        )
        if not authenticated_user:
            raise serializers.ValidationError("Invalid email or password.")

        attrs["user"] = authenticated_user
        return attrs


class AdminNotificationSerializer(serializers.ModelSerializer):
    """Serializer for staff notifications feed."""

    class Meta:
        model = AdminNotification
        fields = ("id", "title", "message", "payload", "is_read", "created_at")


class UserProfileUpdateSerializer(serializers.Serializer):
    """Serializer for customer/staff profile edits excluding email changes."""

    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    profile_image = serializers.ImageField(required=False, allow_null=True)
    clear_profile_image = serializers.BooleanField(required=False, default=False)

    def update(self, instance, validated_data):
        profile, _ = UserProfile.objects.get_or_create(user=instance)

        if "first_name" in validated_data:
            instance.first_name = validated_data["first_name"]
        if "last_name" in validated_data:
            instance.last_name = validated_data["last_name"]
        instance.save(update_fields=["first_name", "last_name"])

        if "phone" in validated_data:
            profile.phone = validated_data["phone"]

        if validated_data.get("clear_profile_image"):
            profile.profile_image.delete(save=False)
            profile.profile_image = None
        elif "profile_image" in validated_data:
            profile.profile_image = validated_data["profile_image"]

        profile.save(update_fields=["phone", "profile_image", "updated_at"])
        return instance


class MenuItemSerializer(serializers.ModelSerializer):
    """Serializer for menu item responses including average ratings."""

    image_url = serializers.SerializerMethodField(read_only=True)
    image_file = serializers.SerializerMethodField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    ordered_count = serializers.SerializerMethodField(read_only=True)

    def get_image_url(self, obj):
        url = obj.preferred_image_url
        if not url:
            return ""
        return url

    def get_image_file(self, obj):
        if not obj.image_file:
            return ""
        return obj.image_file.url

    def get_ordered_count(self, obj):
        return int(getattr(obj, "ordered_count", 0) or 0)

    class Meta:
        model = MenuItem
        fields = (
            "id",
            "name",
            "description",
            "price",
            "category",
            "image_url",
            "image_file",
            "is_available",
            "is_featured",
            "dietary_tags",
            "average_rating",
            "ordered_count",
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
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        if not user:
            raise serializers.ValidationError("Authentication is required to create a reservation.")
        if user.is_staff:
            raise serializers.ValidationError("Only customer accounts can create reservations.")

        validated_data["email"] = user.email
        reservation = Reservation(user=user, **validated_data)

        reservation.save()
        return reservation


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for listing and creating menu item reviews."""

    user_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Review
        fields = ("id", "menu_item", "user", "user_name", "rating", "comment", "created_at")
        read_only_fields = ("id", "user", "user_name", "created_at")

    def get_user_name(self, obj: Review) -> str:
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.username

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        menu_item = attrs.get("menu_item")

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication is required to submit a review.")
        if user.is_staff:
            raise serializers.ValidationError("Only customer accounts can submit reviews.")

        if Review.objects.filter(user=user, menu_item=menu_item).exists():
            raise serializers.ValidationError("You already reviewed this menu item.")

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["user"] = request.user

        try:
            review = Review(**validated_data)
            review.save()
            return review
        except IntegrityError as exc:
            raise serializers.ValidationError("You already reviewed this menu item.") from exc


class OrderItemInputSerializer(serializers.Serializer):
    """Input payload for a single order line item."""

    menu_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=50)


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for persisted order line items."""

    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "menu_item", "menu_item_name", "quantity", "unit_price", "line_total")


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for customer orders and nested line items."""

    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "email",
            "status",
            "total_amount",
            "stripe_payment_intent_id",
            "items",
            "created_at",
            "updated_at",
        )


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for order creation and cart payload validation."""

    email = serializers.EmailField(required=False)
    items = OrderItemInputSerializer(many=True, min_length=1)

    def validate_items(self, items):
        menu_item_ids = [item["menu_item_id"] for item in items]
        menu_items = MenuItem.objects.filter(id__in=menu_item_ids)
        menu_item_map = {item.id: item for item in menu_items}

        for item in items:
            menu_item = menu_item_map.get(item["menu_item_id"])
            if not menu_item:
                raise serializers.ValidationError(f"Menu item {item['menu_item_id']} does not exist.")
            if not menu_item.is_available:
                raise serializers.ValidationError(f"{menu_item.name} is currently unavailable.")

        return items

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        if not user:
            raise serializers.ValidationError("Authentication is required to checkout.")
        if user.is_staff:
            raise serializers.ValidationError("Only customer accounts can checkout.")

        email = user.email
        if not email:
            raise serializers.ValidationError({"email": "Please set an email address on your account before checkout."})

        items_payload = validated_data["items"]
        menu_items = MenuItem.objects.in_bulk([item["menu_item_id"] for item in items_payload])

        with transaction.atomic():
            order = Order.objects.create(user=user, email=email)
            total_amount = 0

            for payload in items_payload:
                menu_item = menu_items[payload["menu_item_id"]]
                quantity = payload["quantity"]
                order_item = OrderItem(
                    order=order,
                    menu_item=menu_item,
                    quantity=quantity,
                    unit_price=menu_item.price,
                )
                order_item.save()
                total_amount += order_item.line_total

            order.total_amount = total_amount
            order.save(update_fields=["total_amount", "updated_at"])

        return order
