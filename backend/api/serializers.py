"""Serializers for auth, menu, reservations, reviews, orders, and analytics."""

from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError, transaction
from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import (
    AdminNotification,
    FrontendSettings,
    MenuItem,
    Order,
    OrderItem,
    Reservation,
    Review,
    StaffMember,
    Table,
    UserProfile,
)

User = get_user_model()


class UserPublicSerializer(serializers.ModelSerializer):
    """Public-facing user payload used in auth responses."""

    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()

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
            "is_active",
            "role",
            "must_change_password",
        )

    def get_role(self, obj):
        profile = getattr(obj, "profile", None)
        if profile:
            return profile.role
        return "admin" if obj.is_staff else "customer"

    def get_must_change_password(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.must_change_password if profile else False

    def get_phone(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.phone if profile else ""

    def get_profile_image_url(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile or not profile.profile_image:
            return ""
        image_name = str(profile.profile_image.name or "")
        if not image_name or not default_storage.exists(image_name):
            return ""
        return profile.profile_image.url


class UserRegisterSerializer(serializers.ModelSerializer):
    """Serializer for customer registration requests."""

    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=True, min_length=1)

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name")

    def create(self, validated_data):
        first_name = validated_data.get("first_name", "").strip()
        base_username = first_name.lower().replace(" ", "") or "user"
        
        # Generate a unique username
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            import random
            suffix = random.randint(10, 99)
            username = f"{base_username}{suffix}"
            counter += 1
            if counter > 10: # Fallback to more entropy
                username = f"{base_username}{random.randint(1000, 9999)}"
                break

        return User.objects.create_user(
            username=username,
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=validated_data.get("last_name", ""),
        )


class LoginSerializer(serializers.Serializer):
    """Serializer for JWT login credentials."""

    email = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    identifier = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = (
            attrs.get("identifier")
            or attrs.get("email")
            or attrs.get("username")
            or ""
        ).strip()
        password = attrs["password"]

        if not identifier:
            raise serializers.ValidationError("Email or username is required.")

        if "@" in identifier:
            user = User.objects.filter(email__iexact=identifier.lower()).first()
        else:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account is deactivated. Please contact support.")

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

    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = AdminNotification
        fields = ("id", "title", "message", "notif_type", "payload", "is_read", "created_at", "order_number")


class FrontendSettingsSerializer(serializers.ModelSerializer):
    """Serializer for merged frontend settings content payload."""

    content = serializers.SerializerMethodField()

    class Meta:
        model = FrontendSettings
        fields = ("content", "updated_at")

    def get_content(self, obj):
        content = obj.resolved_content()
        home = content.get("home") or {}
        gallery_images = home.get("gallery_images") or []
        # ensure hero and about images have sensible fallbacks so frontend
        # never sees an empty string or missing key
        if not home.get("hero_bg_image"):
            home["hero_bg_image"] = "/images/hero-placeholder.svg"
        if not home.get("reservation_bg_image"):
            home["reservation_bg_image"] = "/images/hero-placeholder.svg"
        if not home.get("about_image"):
            home["about_image"] = "/images/hero-placeholder.png"

        # Normalize legacy/external gallery URLs to bundled local assets so
        # frontend images always render even when external CDNs fail.
        fallback_gallery = [
            "/images/gallery-1.png",
            "/images/gallery-2.svg",
            "/images/gallery-3.svg",
            "/images/gallery-4.svg",
            "/images/gallery-5.svg",
        ]
        normalized_gallery = []
        for index in range(5):
            source = ""
            if index < len(gallery_images):
                source = str(gallery_images[index] or "").strip()
            if source.startswith("https://images.unsplash.com"):
                source = ""
            normalized_gallery.append(source or fallback_gallery[index])

        home["gallery_images"] = normalized_gallery
        content["home"] = home
        return content


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


class StaffMemberSerializer(serializers.ModelSerializer):
    """Serializer for public staff member profiles."""

    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = StaffMember
        fields = (
            "id",
            "full_name",
            "role",
            "role_display",
            "email",
            "phone",
            "photo",
            "bio",
            "hire_date",
            "is_active",
            "display_on_website",
            "created_at",
        )


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


class TableSerializer(serializers.ModelSerializer):
    """Serializer for table listing for reservation UI."""

    seats = serializers.IntegerField(source="capacity", read_only=True)

    class Meta:
        model = Table
        fields = ("id", "table_number", "seats", "description", "is_active")


class ReservationSerializer(serializers.ModelSerializer):
    """Serializer for reservation create and retrieve responses."""

    table = TableSerializer(read_only=True)
    table_id = serializers.PrimaryKeyRelatedField(
        queryset=Table.objects.all(), source="table", write_only=True
    )

    class Meta:
        model = Reservation
        fields = (
            "id",
            "name",
            "email",
            "phone",
            "date",
            "time_slot",
            "party_size",
            "party_duration_hours",
            "table",
            "table_id",
            "special_requests",
            "status",
            "confirmation_code",
            "created_at",
        )
        read_only_fields = ("id", "status", "confirmation_code", "created_at", "table")

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

    menu_item_id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    price_raw = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(required=False, min_value=1, max_value=50)
    qty = serializers.IntegerField(required=False, min_value=1, max_value=50)

    def validate(self, attrs):
        quantity = attrs.get("quantity")
        qty = attrs.get("qty")
        attrs["quantity"] = quantity if quantity is not None else (qty if qty is not None else 1)

        if not attrs.get("menu_item_id") and not attrs.get("name"):
            raise serializers.ValidationError("Each item must include menu_item_id or name.")

        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for persisted order line items."""

    menu_item_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "menu_item",
            "menu_item_name",
            "item_name",
            "item_price",
            "quantity",
            "subtotal",
            "unit_price",
            "line_total",
        )

    def get_menu_item_name(self, obj: OrderItem) -> str:
        if obj.menu_item:
            return obj.menu_item.name
        return obj.item_name


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for customer orders and nested line items."""

    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "customer_name",
            "customer_email",
            "status",
            "total_amount",
            "notes",
            "stripe_payment_intent_id",
            "assigned_chef",
            "items",
            "created_at",
            "updated_at",
        )


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for order creation and cart payload validation."""

    email = serializers.EmailField(required=False)
    items = OrderItemInputSerializer(many=True, min_length=1)

    def validate_items(self, items):
        menu_item_ids = [item["menu_item_id"] for item in items if item.get("menu_item_id")]
        menu_items = MenuItem.objects.filter(id__in=menu_item_ids)
        menu_item_map = {item.id: item for item in menu_items}

        for item in items:
            menu_item_id = item.get("menu_item_id")
            if menu_item_id:
                menu_item = menu_item_map.get(menu_item_id)
                if not menu_item:
                    raise serializers.ValidationError(f"Menu item {menu_item_id} does not exist.")
                if not menu_item.is_available:
                    raise serializers.ValidationError(f"{menu_item.name} is currently unavailable.")
            else:
                if item.get("price_raw") is None:
                    raise serializers.ValidationError("Raw price is required when menu_item_id is not provided.")

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
        menu_items = MenuItem.objects.in_bulk(
            [item["menu_item_id"] for item in items_payload if item.get("menu_item_id")]
        )

        with transaction.atomic():
            # Keep a single active pending order per customer so closely-timed
            # checkouts are consolidated instead of creating fragmented orders.
            order = (
                Order.objects.select_for_update()
                .filter(
                    customer=user,
                    status=Order.Status.PENDING,
                )
                .order_by("-created_at")
                .first()
            )
            customer_name = (f"{user.first_name} {user.last_name}".strip() or user.username)
            if not order:
                order = Order.objects.create(
                    customer=user,
                    customer_name=customer_name,
                    customer_email=email,
                )
            else:
                dirty_fields = []
                if order.customer_id != user.id:
                    order.customer = user
                    dirty_fields.append("customer")
                if not order.customer_name:
                    order.customer_name = customer_name
                    dirty_fields.append("customer_name")
                if not order.customer_email:
                    order.customer_email = email
                    dirty_fields.append("customer_email")
                if dirty_fields:
                    dirty_fields.append("updated_at")
                    order.save(update_fields=dirty_fields)
            total_amount = 0

            for payload in items_payload:
                quantity = payload["quantity"]
                menu_item = menu_items.get(payload.get("menu_item_id"))
                item_name = payload.get("name", "")
                item_price = payload.get("price_raw")
                if menu_item:
                    item_name = menu_item.name
                    item_price = menu_item.price
                order_item = OrderItem(
                    order=order,
                    menu_item=menu_item,
                    item_name=item_name,
                    item_price=item_price,
                    quantity=quantity,
                    unit_price=item_price,
                )
                order_item.save()
                total_amount += order_item.subtotal

            previous_total = order.total_amount if order.pk else Decimal("0.00")
            order.total_amount = previous_total + total_amount
            order.save(update_fields=["total_amount", "updated_at"])

        return order
