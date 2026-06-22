from fastapi import APIRouter, Body, Depends, HTTPException, Path, status

from app.dependencies import get_teacher_service
from app.schemas.auth import StudentEntry
from app.services.teacher_service import TeacherService

_ID_PATTERN = r"^[A-Za-z0-9_-]{1,128}$"
TeacherId = Path(..., pattern=_ID_PATTERN, description="Teacher identifier")
StudentId = Path(..., pattern=_ID_PATTERN, description="Student user_id")

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.get("/{teacher_id}/students", response_model=list[StudentEntry])
async def get_students(
    teacher_id: str = TeacherId,
    service: TeacherService = Depends(get_teacher_service),
) -> list[StudentEntry]:
    return await service.get_students(teacher_id)


@router.post("/{teacher_id}/students", response_model=list[StudentEntry])
async def add_student(
    teacher_id: str = TeacherId,
    username: str = Body(..., embed=True),
    service: TeacherService = Depends(get_teacher_service),
) -> list[StudentEntry]:
    try:
        return await service.add_student(teacher_id, username)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{teacher_id}/students/{student_id}", response_model=list[StudentEntry])
async def remove_student(
    teacher_id: str = TeacherId,
    student_id: str = StudentId,
    service: TeacherService = Depends(get_teacher_service),
) -> list[StudentEntry]:
    return await service.remove_student(teacher_id, student_id)
