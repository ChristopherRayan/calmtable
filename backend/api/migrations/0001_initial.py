"""Initial schema for menu items and reservations."""
from django.db import migrations, models


class Migration(migrations.Migration):
    """Create core menu and reservation tables."""

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MenuItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField()),
                ("price", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("starters", "Starters"),
                            ("mains", "Mains"),
                            ("desserts", "Desserts"),
                            ("drinks", "Drinks"),
                        ],
                        max_length=20,
                    ),
                ),
                ("image_url", models.URLField(blank=True)),
                ("is_available", models.BooleanField(default=True)),
                ("is_featured", models.BooleanField(default=False)),
                ("dietary_tags", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("name",)},
        ),
        migrations.CreateModel(
            name="Reservation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(max_length=30)),
                ("date", models.DateField()),
                ("time_slot", models.TimeField()),
                ("party_size", models.PositiveSmallIntegerField()),
                ("special_requests", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("confirmed", "Confirmed"),
                            ("cancelled", "Cancelled"),
                        ],
                        default="pending",
                        max_length=12,
                    ),
                ),
                ("confirmation_code", models.CharField(db_index=True, editable=False, max_length=8, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ("-created_at",)},
        ),
    ]
