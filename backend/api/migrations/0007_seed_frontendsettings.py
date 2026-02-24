"""Seed singleton frontend settings row for admin-managed frontend content."""
from django.db import migrations


def create_default_frontend_settings(apps, schema_editor):
    import api.models

    FrontendSettings = apps.get_model("api", "FrontendSettings")
    FrontendSettings.objects.get_or_create(
        key="default",
        defaults={"content": api.models.default_frontend_content()},
    )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_frontendsettings"),
    ]

    operations = [
        migrations.RunPython(create_default_frontend_settings, migrations.RunPython.noop),
    ]
