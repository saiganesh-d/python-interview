from rest_framework import serializers

from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    """Converts Note <-> JSON and validates input.

    `owner` is read-only here: we set it from request.user in the view,
    so a user can never create notes for someone else (security).
    """

    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Note
        fields = ["id", "owner", "title", "body", "created_at", "updated_at"]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def validate_title(self, value):
        # Example field-level validation (interviewers like seeing this).
        if not value.strip():
            raise serializers.ValidationError("Title cannot be blank.")
        return value
