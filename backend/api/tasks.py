"""Celery tasks for async reservation notifications."""
from celery import shared_task


@shared_task
def send_reservation_notification(reservation_id: int) -> str:
    """Placeholder task for reservation notification dispatch."""
    return f"notification_queued_for_reservation_{reservation_id}"
