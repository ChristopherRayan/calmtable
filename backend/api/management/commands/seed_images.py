from django.core.management.base import BaseCommand
from api.models import FrontendSettings, MenuItem
import random

# High-quality Unsplash source URLs focusing on African/Malawian food and restaurant ambiance
HERO_IMAGES = [
    "https://images.unsplash.com/photo-1549466668-3d12d9b62768?q=80&w=2000&auto=format&fit=crop", # African food setting
    "https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?q=80&w=2000&auto=format&fit=crop", # Spices
]

RESERVATION_IMAGES = [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop", # Restaurant interior
]

GALLERY_IMAGES = [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop", # Salad/healthy
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop", # Feast
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop", # Grilling
    "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop", # Ribs
    "https://images.unsplash.com/photo-1560963689-02e82017fb3c?q=80&w=800&auto=format&fit=crop", # Spices/prep
]

ABOUT_IMAGE = "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1000&auto=format&fit=crop" # People dining/enjoying

MENU_ITEM_IMAGES = [
    "https://images.unsplash.com/photo-1528669826296-19369da2537b?q=80&w=600&auto=format&fit=crop", # Chicken/Stew
    "https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?q=80&w=600&auto=format&fit=crop", # Grilled meat
    "https://images.unsplash.com/photo-1574484284002-952d92456975?q=80&w=600&auto=format&fit=crop", # Fish
    "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?q=80&w=600&auto=format&fit=crop", # Fried fish/chips
    "https://images.unsplash.com/photo-1628294895950-9805252327bc?q=80&w=600&auto=format&fit=crop", # Curries/Stews
    "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=600&auto=format&fit=crop", # Vegetable dish
    "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=600&auto=format&fit=crop", # Meat/BBQ
]

class Command(BaseCommand):
    help = "Seeds the database with authentic African-themed UI images."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Frontend Settings Images...")
        settings = FrontendSettings.get_solo()
        
        content = settings.content
        
        if "home" not in content:
            content["home"] = {}
            
        content["home"]["hero_bg_image"] = HERO_IMAGES[0]
        content["home"]["reservation_bg_image"] = RESERVATION_IMAGES[0]
        content["home"]["gallery_images"] = GALLERY_IMAGES
        content["home"]["about_image"] = ABOUT_IMAGE
        
        settings.content = content
        settings.save()
        self.stdout.write(self.style.SUCCESS("Frontend images updated successfully!"))

        self.stdout.write("Seeding Menu Item Images...")
        items = MenuItem.objects.all()
        updated_count = 0
        
        for item in items:
            if not item.image_url or "dish-" in item.image_url or "http" not in item.image_url:
                # Assign a random relevant image from the unsplash list
                item.image_url = random.choice(MENU_ITEM_IMAGES)
                item.save()
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Updated {updated_count} menu item images successfully!"))
        self.stdout.write(self.style.SUCCESS("All image seeding completed!"))
