import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

@pytest.mark.django_db
def test_admin_sso_view_creates_session_and_redirects(client):
    """Admin SSO view should log in the user and redirect to /admin/."""
    staff_user = User.objects.create_user(
        username="staff_sso",
        email="staff_sso@example.com",
        password="password123",
        is_staff=True,
    )
    
    refresh = RefreshToken.for_user(staff_user)
    token = str(refresh.access_token)
    
    response = client.get(f"/api/auth/login/admin/?token={token}")
    
    # Assert redirect to /admin/
    assert response.status_code == 302
    assert response.url == "/admin/"
    
    # Verify session is created
    assert client.session["_auth_user_id"] == str(staff_user.pk)

@pytest.mark.django_db
def test_admin_sso_view_fails_for_non_staff(client):
    """Admin SSO view should fail if the user is not staff."""
    customer = User.objects.create_user(
        username="customer_sso",
        email="customer_sso@example.com",
        password="password123",
        is_staff=False,
    )
    
    refresh = RefreshToken.for_user(customer)
    token = str(refresh.access_token)
    
    response = client.get(f"/api/auth/login/admin/?token={token}")
    
    # Redirection to admin login indicates failure in this context
    assert response.status_code == 302
    assert response.url == "/admin/login/"
