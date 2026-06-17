from django.conf import settings
from django.db import models


class Note(models.Model):
    """A note that belongs to a single user.

    Talking points:
      - ForeignKey -> each note belongs to one user (one-to-many).
      - on_delete=CASCADE -> deleting a user deletes their notes.
      - auto_now_add / auto_now -> created vs updated timestamps.
      - ordering -> default newest-first; uses an index on -created_at in practice.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes",
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
