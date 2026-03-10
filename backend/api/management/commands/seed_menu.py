"""Management command to seed the database with Malawian menu items."""
from django.core.management.base import BaseCommand
from api.models import MenuItem


MENU_ITEMS = [
    # ─── STARTERS ─────────────────────────────────────────────────────────
    {
        "name": "Grilled Chambo Starter",
        "description": "Small fillet of freshly grilled Lake Malawi chambo, served with lemon wedge and tomato relish.",
        "price": "3500.00",
        "category": MenuItem.Category.STARTERS,
        "is_featured": True,
        "dietary_tags": ["gluten-free"],
    },
    {
        "name": "Pumpkin Soup",
        "description": "Creamy blended Malawian pumpkin soup with a hint of ginger and coconut milk.",
        "price": "2500.00",
        "category": MenuItem.Category.STARTERS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Mandazi Basket",
        "description": "Freshly fried East African doughnuts, lightly sweetened with cardamom. Served warm with dipping sauce.",
        "price": "2000.00",
        "category": MenuItem.Category.STARTERS,
        "is_featured": False,
        "dietary_tags": ["vegetarian"],
    },
    {
        "name": "Fried Matemba",
        "description": "Crispy small dried fish (matemba) lightly seasoned and pan-fried. A classic Malawian appetizer.",
        "price": "2800.00",
        "category": MenuItem.Category.STARTERS,
        "is_featured": True,
        "dietary_tags": ["gluten-free"],
    },
    {
        "name": "Avocado & Tomato Salad",
        "description": "Fresh garden salad with ripe Malawian avocado, tomatoes, red onion, and a citrus vinaigrette.",
        "price": "2200.00",
        "category": MenuItem.Category.STARTERS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    # ─── MAINS ────────────────────────────────────────────────────────────
    {
        "name": "Whole Grilled Chambo",
        "description": "The pride of Malawi. Whole Lake Malawi chambo grilled over charcoal, served with nsima, masamba, and tomato sauce.",
        "price": "8500.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": True,
        "dietary_tags": ["gluten-free"],
    },
    {
        "name": "Beef Stew with Nsima",
        "description": "Slow-cooked tender Malawian beef in a rich tomato and onion gravy. Served with thick nsima and seasonal greens.",
        "price": "7500.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": True,
        "dietary_tags": ["gluten-free"],
    },
    {
        "name": "Goat Meat Curry",
        "description": "Slow-simmered Malawian goat meat in aromatic spices and tomatoes. Served with nsima or rice.",
        "price": "9000.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": True,
        "dietary_tags": ["gluten-free"],
    },
    {
        "name": "Masamba Otendera",
        "description": "Traditional Malawian pounded leafy greens cooked in groundnut flour. Served with nsima. A family favourite.",
        "price": "5500.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Chicken Stew & Rice",
        "description": "Tender farm chicken braised in a tomato-based sauce with onions and Malawian spices. Served with steamed rice.",
        "price": "7000.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": True,
        "dietary_tags": ["gluten-free"],
    },
    {
        "name": "Tilapia Fillet in Peanut Sauce",
        "description": "Pan-fried tilapia fillet topped with creamy groundnut sauce, served with steamed rice and vegetables.",
        "price": "8000.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": False,
        "dietary_tags": ["gluten-free"],
    },
    {
        "name": "Mixed Grill Platter",
        "description": "A generous platter of grilled beef, chicken, and chambo fillet with chips, salad, and two dipping sauces.",
        "price": "14000.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": True,
        "dietary_tags": [],
    },
    {
        "name": "Beans & Nsima",
        "description": "Hearty Malawian kidney beans in tomato and onion sauce. Served with thick nsima. Simple, filling, and delicious.",
        "price": "4500.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Nkhuku wa Chigayo",
        "description": "Traditional Malawian free-range chicken cooked in a tomato and groundnut sauce with seasonal vegetables.",
        "price": "8500.00",
        "category": MenuItem.Category.MAINS,
        "is_featured": False,
        "dietary_tags": ["gluten-free"],
    },
    # ─── DESSERTS ─────────────────────────────────────────────────────────
    {
        "name": "Papaya & Honey",
        "description": "Fresh sliced Malawian papaya drizzled with wild honey and a sprinkle of lime zest.",
        "price": "2000.00",
        "category": MenuItem.Category.DESSERTS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Banana Fritters",
        "description": "Golden-fried ripe banana fritters dusted with cinnamon sugar, served with vanilla cream.",
        "price": "2500.00",
        "category": MenuItem.Category.DESSERTS,
        "is_featured": True,
        "dietary_tags": ["vegetarian"],
    },
    {
        "name": "Malawian Cheesecake",
        "description": "Creamy baked cheesecake with a biscuit base, topped with passion fruit compote.",
        "price": "3500.00",
        "category": MenuItem.Category.DESSERTS,
        "is_featured": False,
        "dietary_tags": ["vegetarian"],
    },
    {
        "name": "Mango Sorbet",
        "description": "Homemade chilled mango sorbet using fresh Malawian mangoes. A perfect refreshing finish.",
        "price": "2200.00",
        "category": MenuItem.Category.DESSERTS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    # ─── DRINKS ───────────────────────────────────────────────────────────
    {
        "name": "Maheu",
        "description": "Traditional Malawian fermented maize drink. Thick, mildly sour, nutritious and refreshing.",
        "price": "1200.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Hibiscus Juice (Zobo)",
        "description": "Chilled freshly brewed hibiscus flower drink with ginger and mint. Served over ice.",
        "price": "1500.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": True,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Fresh Mango Juice",
        "description": "Pure blended fresh Malawian mangoes. No added sugar. Served chilled.",
        "price": "1800.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Granadilla Lemonade",
        "description": "Fresh-squeezed lemonade mixed with passion fruit pulp. Sweet, tangy, and refreshing.",
        "price": "2000.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Malawi Chibuku",
        "description": "Traditional Malawian opaque sorghum beer. Earthy, authentic, and full of character.",
        "price": "1500.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Iced Rooibos Tea",
        "description": "Chilled African rooibos tea served over ice with honey and a squeeze of orange.",
        "price": "1500.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Bottled Water",
        "description": "Chilled still or sparkling mineral water.",
        "price": "500.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": False,
        "dietary_tags": ["vegan", "gluten-free"],
    },
    {
        "name": "Soft Drink",
        "description": "Choice of Coca-Cola, Fanta Orange, Fanta Grape, or Sprite. Served chilled.",
        "price": "800.00",
        "category": MenuItem.Category.DRINKS,
        "is_featured": False,
        "dietary_tags": ["vegan"],
    },
]


class Command(BaseCommand):
    help = "Seed the database with authentic Malawian menu items."

    def handle(self, *args, **kwargs):
        created = 0
        skipped = 0
        for item in MENU_ITEMS:
            obj, was_created = MenuItem.objects.get_or_create(
                name=item["name"],
                defaults={
                    "description": item["description"],
                    "price": item["price"],
                    "category": item["category"],
                    "is_available": True,
                    "is_featured": item["is_featured"],
                    "dietary_tags": item["dietary_tags"],
                },
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Menu seed complete: {created} created, {skipped} already existed."
            )
        )
