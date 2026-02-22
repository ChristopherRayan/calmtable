"""Filter definitions for API query parameter filtering."""
import django_filters

from .models import MenuItem


class MenuItemFilter(django_filters.FilterSet):
    """Menu filters by category and dietary tags."""

    dietary_tags = django_filters.CharFilter(method="filter_dietary_tags")

    class Meta:
        model = MenuItem
        fields = ("category", "dietary_tags")

    def filter_dietary_tags(self, queryset, _name, value):
        request = getattr(self, "request", None)
        tags = []
        if request is not None:
            tags = request.query_params.getlist("dietary_tags")

        if not tags and value:
            tags = [tag.strip() for tag in value.split(",") if tag.strip()]

        for tag in tags:
            queryset = queryset.filter(dietary_tags__contains=[tag])

        return queryset
