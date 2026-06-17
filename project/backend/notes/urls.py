from rest_framework.routers import DefaultRouter

from .views import NoteViewSet

# The router auto-generates: GET/POST /notes/ and GET/PUT/PATCH/DELETE /notes/{id}/
router = DefaultRouter()
router.register(r"notes", NoteViewSet, basename="note")

urlpatterns = router.urls
