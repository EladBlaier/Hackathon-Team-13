def student_conversations_prefix(student_id: str) -> str:
    return f"students/{student_id}/conversations/"


def conversation_prefix(student_id: str, conversation_id: str) -> str:
    return f"{student_conversations_prefix(student_id)}{conversation_id}/"


def meta_key(student_id: str, conversation_id: str) -> str:
    return f"{conversation_prefix(student_id, conversation_id)}meta.json"


def turn_homework_key(
    student_id: str, conversation_id: str, turn: int, index: int, ext: str
) -> str:
    return (
        f"{conversation_prefix(student_id, conversation_id)}"
        f"turn_{turn:02d}_homework_{index:02d}.{ext}"
    )


def turn_response_key(student_id: str, conversation_id: str, turn: int) -> str:
    return f"{conversation_prefix(student_id, conversation_id)}turn_{turn:02d}_response.json"


def profile_key(student_id: str) -> str:
    """Student-level learner profile, shared across all of a student's conversations."""
    return f"students/{student_id}/profile.json"


def auth_key(username: str) -> str:
    return f"auth/{username}.json"


def auth_by_id_key(user_id: str) -> str:
    return f"auth_by_id/{user_id}.json"


def teacher_profile_key(teacher_id: str) -> str:
    return f"teachers/{teacher_id}/profile.json"


def context_key(student_id: str, conversation_id: str) -> str:
    """Per-conversation managed-history file. Lives inside the conversation prefix
    but is ignored by turn parsing (it matches no turn_* pattern)."""
    return f"{conversation_prefix(student_id, conversation_id)}context.json"
