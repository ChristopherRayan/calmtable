"""Model signal handlers for reservation lifecycle side effects."""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Reservation
from .tasks import send_reservation_confirmation_email, send_reservation_status_email


def _dispatch_task(task, *args):
    """Dispatch Celery task with a safe synchronous fallback for test/local contexts."""
    try:
        task.delay(*args)
    except Exception:
        task(*args)


@receiver(pre_save, sender=Reservation)
def capture_previous_reservation_status(sender, instance: Reservation, **kwargs):
    """Capture status before save to detect status transitions."""
    if not instance.pk:
        instance._previous_status = None
        return

    previous = Reservation.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
    instance._previous_status = previous


@receiver(post_save, sender=Reservation)
def reservation_post_save(sender, instance: Reservation, created: bool, **kwargs):
    """Trigger confirmation/status emails when reservation lifecycle events occur."""
    if created:
        _dispatch_task(send_reservation_confirmation_email, instance.id)
        return

    previous_status = getattr(instance, "_previous_status", None)
    if previous_status and previous_status != instance.status:
        _dispatch_task(send_reservation_status_email, instance.id, instance.status)
