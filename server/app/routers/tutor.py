from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Path, UploadFile, status

from app.dependencies import get_conversation_service, get_tutor_ai_service
from app.schemas.images import ImageUpload
from app.schemas.tutor import (
    ConversationHistory,
    ConversationSummary,
    CreateConversationRequest,
    PostTurnResult,
)
from app.services.conversation_service import ConversationService
from app.services.tutor_ai_service import TutorAIService

# Path identifiers are interpolated into S3 keys, so reject anything that could
# escape the intended prefix (slashes, dots/"..", encoded variants all fail this).
_ID_PATTERN = r"^[A-Za-z0-9_-]{1,128}$"
StudentId = Path(..., pattern=_ID_PATTERN, description="Student identifier")
ConversationId = Path(..., pattern=_ID_PATTERN, description="Conversation identifier")

router = APIRouter(
    prefix="/students/{student_id}/conversations",
    tags=["Math Tutor Conversations"],
)


@router.get("", summary="List Student Conversations", response_model=list[ConversationSummary])
async def list_conversations(
    student_id: str = StudentId,
    service: ConversationService = Depends(get_conversation_service),
) -> list[ConversationSummary]:
    """
    Scans S3 prefixes under the student path to discover conversation folders.
    Reads each folder's meta.json to extract the conversation name.
    """
    return await service.list_conversations(student_id)


@router.post(
    "",
    summary="Create Conversation",
    response_model=ConversationSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    student_id: str = StudentId,
    body: CreateConversationRequest = Body(...),
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationSummary:
    """
    Creates a new conversation with a generated ID and writes meta.json to S3
    containing the conversation name.
    """
    return await service.create_conversation(student_id, body.name)


@router.get(
    "/{conversation_id}",
    summary="Get Conversation History",
    response_model=ConversationHistory,
)
async def get_conversation_history(
    student_id: str = StudentId,
    conversation_id: str = ConversationId,
    service: ConversationService = Depends(get_conversation_service),
) -> ConversationHistory:
    """
    Collects and aggregates all files inside the conversation prefix.
    Reads meta.json for the name and pairs files matching the same turn prefix chronologically.
    """
    return await service.get_history(student_id, conversation_id)


@router.post(
    "/{conversation_id}/turn",
    summary="Post Conversation Turn",
    response_model=PostTurnResult,
)
async def post_conversation_turn(
    student_id: str = StudentId,
    conversation_id: str = ConversationId,
    conversation_name: str = Form(
        ..., description="The name of the conversation to update or create"
    ),
    turn_number: int = Form(
        ..., description="Zero-based or one-based turn index"
    ),
    student_text: str = Form(
        "", description="Optional message the student typed for this turn"
    ),
    images: list[UploadFile] = File(
        default=[], description="Optional student homework images for this turn"
    ),
    service: ConversationService = Depends(get_conversation_service),
    ai: TutorAIService = Depends(get_tutor_ai_service),
) -> PostTurnResult:
    """
    Submits a student turn (homework photos and/or a text message). The backend
    runs the AI tutor to generate feedback, then writes the images and the
    generated feedback to S3 and returns the feedback for the chat to render.
    """
    if turn_number < 0:
        raise HTTPException(
            status_code=400,
            detail="Turn number must be greater than or equal to 0.",
        )

    uploads: list[ImageUpload] = []
    for image in images:
        data = await image.read()
        if not data:
            continue
        uploads.append(
            ImageUpload(
                data=data,
                filename=image.filename,
                content_type=image.content_type or "image/octet-stream",
            )
        )

    if not uploads and not student_text.strip():
        raise HTTPException(
            status_code=400,
            detail="A turn needs at least one image or a text message.",
        )

    # The "brain" loads its own memory (profile + context) and folds this turn
    # back into it; the student's typed message is recorded inside run_turn.
    first_image = uploads[0] if uploads else None
    feedback_data = await ai.run_turn(
        student_id=student_id,
        conversation_id=conversation_id,
        image=first_image.data if first_image else None,
        image_mime=first_image.content_type if first_image else "image/jpeg",
        student_text=student_text,
    )

    return await service.post_turn(
        student_id=student_id,
        conversation_id=conversation_id,
        conversation_name=conversation_name,
        turn_number=turn_number,
        feedback_data=feedback_data,
        images=uploads,
    )
