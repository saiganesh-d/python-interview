from rest_framework import viewsets

from .models import Note
from .serializers import NoteSerializer


class NoteViewSet(viewsets.ModelViewSet):
    """Full CRUD for notes with one small class.

    Talking points:
      - ModelViewSet gives list/create/retrieve/update/destroy + a router
        generates the URLs -> minimal boilerplate.
      - get_queryset filters to request.user -> users only ever see their own
        notes (per-user data isolation). This is the key security pattern.
      - perform_create stamps owner from the authenticated user, not the client.
      - search via ?search=term ; pagination is global (PAGE_SIZE in settings).
    """

    serializer_class = NoteSerializer

    def get_queryset(self):
        qs = Note.objects.filter(owner=self.request.user)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
