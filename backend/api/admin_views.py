"""Custom Django admin views for operational analytics widgets."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.utils import timezone

from .models import Order, OrderItem, Reservation


@staff_member_required
def admin_analytics_data(request):
    """Return dashboard analytics payload for the Django admin index charts."""
    today = timezone.localdate()
    start_date = today - timedelta(days=13)

    day_list = [start_date + timedelta(days=index) for index in range(14)]

    reservation_counts = (
        Reservation.objects.filter(date__gte=start_date, date__lte=today)
        .values("date")
        .annotate(total=Count("id"))
        .order_by("date")
    )
    reservation_map = {entry["date"]: entry["total"] for entry in reservation_counts}

    revenue_by_day = (
        Order.objects.filter(status=Order.Status.PAID, created_at__date__gte=start_date, created_at__date__lte=today)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Sum("total_amount"))
        .order_by("day")
    )
    revenue_map = {entry["day"]: entry["total"] or Decimal("0.00") for entry in revenue_by_day}

    timeline = [
        {
            "date": day.isoformat(),
            "label": day.strftime("%b %d"),
            "reservations": reservation_map.get(day, 0),
            "revenue": float(revenue_map.get(day, Decimal("0.00"))),
        }
        for day in day_list
    ]

    top_dishes = list(
        OrderItem.objects.filter(order__status=Order.Status.PAID)
        .values("menu_item__name")
        .annotate(quantity=Sum("quantity"))
        .order_by("-quantity", "menu_item__name")[:8]
    )
    top_dishes_payload = [
        {"name": entry["menu_item__name"], "quantity": int(entry["quantity"] or 0)} for entry in top_dishes
    ]

    order_status_counts = (
        Order.objects.values("status")
        .annotate(total=Count("id"))
        .order_by("status")
    )
    status_payload = [{"status": entry["status"], "count": int(entry["total"])} for entry in order_status_counts]

    todays_reservations = Reservation.objects.filter(date=today).count()
    total_revenue = (
        Order.objects.filter(status=Order.Status.PAID).aggregate(total=Sum("total_amount"))["total"]
        or Decimal("0.00")
    )
    total_orders = Order.objects.count()
    paid_orders = Order.objects.filter(status=Order.Status.PAID).count()

    return JsonResponse(
        {
            "generated_at": timezone.now().isoformat(),
            "summary": {
                "todays_reservations": todays_reservations,
                "total_revenue": float(total_revenue),
                "total_orders": total_orders,
                "paid_orders": paid_orders,
            },
            "timeline": timeline,
            "top_dishes": top_dishes_payload,
            "order_status": status_payload,
        }
    )
