from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_connection
from app.dependencies import require_roles
from app.schemas.room_type import (
    RoomTypeCreate,
    RoomTypeUpdate,
    RoomTypeResponse
)
from psycopg2.errors import UniqueViolation

router = APIRouter(
    prefix="/room-types",
    tags=["room-types"]
)


@router.get(
    "",
    response_model=list[RoomTypeResponse]
)
def get_room_types():

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                room_type_id,
                type_name,
                max_occupancy
            FROM room_type
            ORDER BY room_type_id;
            """
        )

        rows = cursor.fetchall()

        return [
            {
                "room_type_id": row[0],
                "type_name": row[1],
                "max_occupancy": row[2]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()


@router.get(
    "/{room_type_id}",
    response_model=RoomTypeResponse
)
def get_room_type(room_type_id: int):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                room_type_id,
                type_name,
                max_occupancy
            FROM room_type
            WHERE room_type_id = %s;
            """,
            (room_type_id,)
        )

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room type not found"
            )

        return {
            "room_type_id": row[0],
            "type_name": row[1],
            "max_occupancy": row[2]
        }

    finally:
        cursor.close()
        connection.close()

@router.post(
    "",
    response_model=RoomTypeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_room_type(
    room_type_data: RoomTypeCreate,
    current_user=Depends(
        require_roles("manager", "owner")
    )
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO room_type (
                type_name,
                max_occupancy
            )
            VALUES (%s, %s)
            RETURNING
                room_type_id,
                type_name,
                max_occupancy;
            """,
            (
                room_type_data.type_name,
                room_type_data.max_occupancy
            )
        )

        row = cursor.fetchone()

        connection.commit()

        return {
            "room_type_id": row[0],
            "type_name": row[1],
            "max_occupancy": row[2]
        }

    except UniqueViolation:
        connection.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room type already exists"
        )

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

@router.patch(
    "/{room_type_id}",
    response_model=RoomTypeResponse
)
def update_room_type(
    room_type_id: int,
    room_type_data: RoomTypeUpdate,
    current_user=Depends(
        require_roles("manager", "owner")
    )
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # Check whether room type exists
        cursor.execute(
            """
            SELECT
                room_type_id,
                type_name,
                max_occupancy
            FROM room_type
            WHERE room_type_id = %s;
            """,
            (room_type_id,)
        )

        existing_room_type = cursor.fetchone()

        if existing_room_type is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room type not found"
            )

        # Get only fields supplied by the client
        update_data = room_type_data.model_dump(
            exclude_unset=True
        )

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one field is required"
            )

        type_name = update_data.get(
            "type_name",
            existing_room_type[1]
        )

        max_occupancy = update_data.get(
            "max_occupancy",
            existing_room_type[2]
        )

        cursor.execute(
            """
            UPDATE room_type
            SET
                type_name = %s,
                max_occupancy = %s
            WHERE room_type_id = %s
            RETURNING
                room_type_id,
                type_name,
                max_occupancy;
            """,
            (
                type_name,
                max_occupancy,
                room_type_id
            )
        )

        row = cursor.fetchone()

        connection.commit()

        return {
            "room_type_id": row[0],
            "type_name": row[1],
            "max_occupancy": row[2]
        }

    except UniqueViolation:
        connection.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room type already exists"
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
    "/{room_type_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_room_type(
    room_type_id: int,
    current_user=Depends(
        require_roles("manager", "owner")
    )
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM room_type
            WHERE room_type_id = %s
            RETURNING room_type_id;
            """,
            (room_type_id,)
        )

        row = cursor.fetchone()

        if row is None:
            connection.rollback()

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room type not found"
            )

        connection.commit()

        return None

    except HTTPException:
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()