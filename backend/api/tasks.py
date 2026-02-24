"""Celery tasks for async reservation confirmation and status emails."""
from __future__ import annotations

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.defaultfilters import date as date_filter
from celery import shared_task

from .models import Reservation


def _build_reservation_html(reservation: Reservation, heading: str, status_line: str) -> str:
    """Render branded HTML email body for reservation notifications."""
    reservation_url = f"{settings.SITE_BASE_URL.rstrip('/')}/reservation/{reservation.confirmation_code}"
    return f"""
    <div style='font-family: Arial, sans-serif; background: #FDFBF7; color: #2B1D16; padding: 24px;'>
      <div style='max-width: 620px; margin: 0 auto; border: 1px solid #D2B48C; border-radius: 12px; background: #fff; overflow: hidden;'>
        <div style='padding: 16px 20px; background: #5C4033; color: #fff;'>
          <h1 style='margin: 0; font-size: 22px;'>Calm Table</h1>
        </div>
        <div style='padding: 20px;'>
          <h2 style='margin-top: 0; color: #5C4033;'>{heading}</h2>
          <p style='margin: 0 0 12px;'>{status_line}</p>
          <p style='margin: 0 0 8px;'><strong>Confirmation Code:</strong> {reservation.confirmation_code}</p>
          <p style='margin: 0 0 8px;'><strong>Date:</strong> {date_filter(reservation.date, 'F j, Y')}</p>
          <p style='margin: 0 0 8px;'><strong>Time:</strong> {reservation.time_slot.strftime('%H:%M')}</p>
          <p style='margin: 0 0 8px;'><strong>Party Size:</strong> {reservation.party_size}</p>
          <p style='margin: 16px 0;'>
            <a href='{reservation_url}' style='background:#5C4033;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;'>
              View Reservation
            </a>
          </p>
        </div>
      </div>
    </div>
    """


def _send_email(recipient: str, subject: str, html: str) -> None:
    """Send email via SendGrid API when configured, otherwise SMTP backend."""
    sendgrid_api_key = settings.SENDGRID_API_KEY
    sender = settings.SENDGRID_FROM_EMAIL or settings.DEFAULT_FROM_EMAIL

    if sendgrid_api_key:
        # Import lazily so app startup does not fail if dependencies are stale.
        import requests

        response = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {sendgrid_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": recipient}]}],
                "from": {"email": sender},
                "subject": subject,
                "content": [{"type": "text/html", "value": html}],
            },
            timeout=10,
        )
        response.raise_for_status()
        return

    message = EmailMultiAlternatives(
        subject=subject,
        body="Please view this email in HTML format.",
        from_email=sender,
        to=[recipient],
    )
    message.attach_alternative(html, "text/html")
    message.send(fail_silently=False)


@shared_task
def send_reservation_confirmation_email(reservation_id: int) -> str:
    """Send async reservation confirmation email to the customer."""
    reservation = Reservation.objects.filter(id=reservation_id).first()
    if not reservation:
        return f"reservation_{reservation_id}_not_found"

    html = _build_reservation_html(
        reservation,
        heading="Your Reservation Request Is Received",
        status_line="Thank you for booking with Calm Table. Keep your confirmation code for lookup.",
    )
    _send_email(reservation.email, "Calm Table Reservation Confirmation", html)
    return f"reservation_confirmation_sent_{reservation_id}"


@shared_task
def send_reservation_status_email(reservation_id: int, status: str) -> str:
    """Send async reservation status update email."""
    reservation = Reservation.objects.filter(id=reservation_id).first()
    if not reservation:
        return f"reservation_{reservation_id}_not_found"

    html = _build_reservation_html(
        reservation,
        heading="Your Reservation Status Was Updated",
        status_line=f"Current status: {status.title()}.",
    )
    _send_email(reservation.email, "Calm Table Reservation Status Update", html)
    return f"reservation_status_sent_{reservation_id}"
