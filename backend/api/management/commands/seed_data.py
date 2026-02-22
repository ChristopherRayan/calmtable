"""Seed sample menu items for local development and demos."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from api.models import MenuItem


class Command(BaseCommand):
    """Populate database with initial sample menu items."""

    help = "Seed sample menu items."

    def handle(self, *args, **options):
        items = [
            {
                "name": "Smoked Tomato Bruschetta",
                "description": "Charred sourdough with tomato confit, basil oil, and sea salt.",
                "price": Decimal("9.50"),
                "category": MenuItem.Category.STARTERS,
                "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f",
                "is_available": True,
                "is_featured": True,
                "dietary_tags": ["vegetarian"],
            },
            {
                "name": "Herb Butter Ribeye",
                "description": "Prime ribeye, truffle mash, broccolini, and rosemary jus.",
                "price": Decimal("28.00"),
                "category": MenuItem.Category.MAINS,
                "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d",
                "is_available": True,
                "is_featured": True,
                "dietary_tags": ["gluten-free"],
            },
            {
                "name": "Citrus Creme Brulee",
                "description": "Vanilla custard with caramel shell and candied citrus zest.",
                "price": Decimal("8.00"),
                "category": MenuItem.Category.DESSERTS,
                "image_url": "https://images.unsplash.com/photo-1551024601-bec78aea704b",
                "is_available": True,
                "is_featured": False,
                "dietary_tags": ["vegetarian"],
            },
            {
                "name": "Garden Sparkler",
                "description": "House botanical soda with cucumber, lime, and mint.",
                "price": Decimal("5.50"),
                "category": MenuItem.Category.DRINKS,
                "image_url": "https://images.unsplash.com/photo-1523362628745-0c100150b504",
                "is_available": True,
                "is_featured": False,
                "dietary_tags": ["vegan", "gluten-free"],
            },
        ]

        created_count = 0
        for item in items:
            _, created = MenuItem.objects.get_or_create(
                name=item["name"],
                defaults=item,
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Seed complete. Created {created_count} menu items."))
