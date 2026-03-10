"""Model signal handlers for reservation lifecycle side effects."""
from django.contrib.auth import get_user_model
from django.contrib.admin.models import LogEntry
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import AdminNotification, Reservation, UserProfile
from .tasks import send_reservation_confirmation_email, send_reservation_status_email

User = get_user_model()


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


@receiver(post_save, sender=User)
def ensure_profile_exists(sender, instance, created: bool, **kwargs):
    """Create a profile row for each new user account."""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=LogEntry)
def audit_log_post_save(sender, instance: LogEntry, created: bool, **kwargs):
    """Create notifications for staff when an important audit log entry is created."""
    if not created:
        return

    # Notify other staff members about changes, excluding the performer
    staff_users = User.objects.filter(is_staff=True, is_active=True).exclude(pk=instance.user_id)

    # Customize message based on action
    action_type = "created" if instance.is_addition() else "changed" if instance.is_change() else "deleted"
    model_name = instance.content_type.model.title() if instance.content_type else "Object"

    title = f"Audit: {model_name} {action_type.capitalize()}"
    message = f"Staff {instance.user.get_username()} {action_type} {model_name}: {instance.object_repr}"

    link_url = None
    if not instance.is_deletion() and instance.content_type:
        from django.urls import reverse
        try:
            link_url = reverse(
                f"admin:{instance.content_type.app_label}_{instance.content_type.model}_change",
                args=[instance.object_id]
            )
        except Exception:
            pass

    notifications = [
        AdminNotification(
            recipient=user,
            title=title,
            message=message,
            notif_type=AdminNotification.Type.AUDIT,
            link_url=link_url
        )
        for user in staff_users
    ]

    if notifications:
        AdminNotification.objects.bulk_create(notifications)
