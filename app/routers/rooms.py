from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2.errors import UniqueViolation

from app.database import get_connection
from app.dependencies import require_roles
from app.schemas.room import (
    RoomCreate,
    RoomResponse
)

router = APIRouter(
    prefix="/rooms",
    tags=["rooms"]
)
@router.get(
    "",
    response_model=list[RoomResponse]
)
def get_rooms():

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                room_id,
                property_id,
                room_number,
                room_type_id
            FROM room
            ORDER BY property_id, NULLIF(regexp_replace(room_number, '\\D', '', 'g'), '')::int, room_number;
            """
        )

        rows = cursor.fetchall()

        return [
            {
                "room_id": row[0],
                "property_id": row[1],
                "room_number": row[2],
                "room_type_id": row[3]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()

@router.post(
    "",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED
)
def create_room(
    room_data: RoomCreate,
    current_user=Depends(
        require_roles("manager", "owner")
    )
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Check property exists
        cursor.execute(
            """
            SELECT property_id
            FROM property
            WHERE property_id = %s;
            """,
            (room_data.property_id,)
        )

        property_row = cursor.fetchone()

        if property_row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        # Check room type exists
        cursor.execute(
            """
            SELECT room_type_id
            FROM room_type
            WHERE room_type_id = %s;
            """,
            (room_data.room_type_id,)
        )

        room_type_row = cursor.fetchone()

        if room_type_row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room type not found"
            )

        # Manager can only create rooms in their property
        if (
            current_user["role"] == "manager"
            and current_user["property_id"] != room_data.property_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage this property"
            )

        cursor.execute(
            """
            INSERT INTO room (
                property_id,
                room_number,
                room_type_id
            )
            VALUES (%s, %s, %s)
            RETURNING
                room_id,
                property_id,
                room_number,
                room_type_id;
            """,
            (
                room_data.property_id,
                room_data.room_number,
                room_data.room_type_id
            )
        )

        row = cursor.fetchone()

        connection.commit()

        return {
            "room_id": row[0],
            "property_id": row[1],
            "room_number": row[2],
            "room_type_id": row[3]
        }

    except UniqueViolation:
        connection.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room number already exists for this property"
        )

    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

@router.get(
    "/{room_id}",
    response_model=RoomResponse
)
def get_room(room_id: int):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                room_id,
                property_id,
                room_number,
                room_type_id
            FROM room
            WHERE room_id = %s;
            """,
            (room_id,)
        )

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )

        return {
            "room_id": row[0],
            "property_id": row[1],
            "room_number": row[2],
            "room_type_id": row[3]
        }

    finally:
        cursor.close()
        connection.close()

from pydantic import BaseModel, Field


class RoomCreate(BaseModel):
    property_id: int
    room_number: str = Field(min_length=1)
    room_type_id: int


class RoomUpdate(BaseModel):
    room_number: str | None = Field(
        default=None,
        min_length=1
    )
    room_type_id: int | None = None


class RoomResponse(BaseModel):
    room_id: int
    property_id: int
    room_number: str
    room_type_id: int

@router.patch(
    "/{room_id}",
    response_model=RoomResponse
)
def update_room(
    room_id: int,
    room_data: RoomUpdate,
    current_user=Depends(
        require_roles("manager", "owner")
    )
):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                room_id,
                property_id,
                room_number,
                room_type_id
            FROM room
            WHERE room_id = %s;
            """,
            (room_id,)
        )

        existing_room = cursor.fetchone()

        if existing_room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )

        property_id = existing_room[1]

        if (
            current_user["role"] == "manager"
            and current_user["property_id"] != property_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage this property"
            )

        update_data = room_data.model_dump(
            exclude_unset=True
        )

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one field is required"
            )

        room_number = update_data.get(
            "room_number",
            existing_room[2]
        )

        room_type_id = update_data.get(
            "room_type_id",
            existing_room[3]
        )

        cursor.execute(
            """
            SELECT room_type_id
            FROM room_type
            WHERE room_type_id = %s;
            """,
            (room_type_id,)
        )

        if cursor.fetchone() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room type not found"
            )

        cursor.execute(
            """
            UPDATE room
            SET
                room_number = %s,
                room_type_id = %s
            WHERE room_id = %s
            RETURNING
                room_id,
                property_id,
                room_number,
                room_type_id;
            """,
            (
                room_number,
                room_type_id,
                room_id
            )
        )

        row = cursor.fetchone()

        connection.commit()

        return {
            "room_id": row[0],
            "property_id": row[1],
            "room_number": row[2],
            "room_type_id": row[3]
        }

    except UniqueViolation:
        connection.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room number already exists for this property"
        )

    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

@router.delete(
    "/{room_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_room(
    room_id: int,
    current_user=Depends(
        require_roles("manager", "owner")
    )
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Check room exists and get its property
        cursor.execute(
            """
            SELECT
                room_id,
                property_id
            FROM room
            WHERE room_id = %s;
            """,
            (room_id,)
        )

        room = cursor.fetchone()

        if room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )

        property_id = room[1]

        # Manager can only delete rooms
        # from their own property
        if (
            current_user["role"] == "manager"
            and current_user["property_id"] != property_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to manage this property"
            )

        cursor.execute(
            """
            DELETE FROM room
            WHERE room_id = %s;
            """,
            (room_id,)
        )

        connection.commit()

        return None

    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()