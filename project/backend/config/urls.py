"""Root URL config.

Routes:
  /admin/                Django admin
  /api/token/            POST username+password -> access & refresh JWT
  /api/token/refresh/    POST refresh -> new access token
  /api/notes/            CRUD for the logged-in user's notes (router)
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include("notes.urls")),
]
