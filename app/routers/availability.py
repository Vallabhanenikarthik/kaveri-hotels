from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_connection
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/availability",
    tags=["availability"]
)


@router.get("")
def get_availability(
    check_in: date,
    check_out: date,
    guest_count: int,
    current_user=Depends(get_current_user)
):
    if check_in >= check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_in must be before check_out"
        )

    if guest_count <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="guest_count must be greater than 0"
        )

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                r.room_id,
                r.property_id,
                r.room_number,
                r.room_type_id,
                rt.max_occupancy,
                rt.price_per_night
            FROM room r
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            WHERE rt.max_occupancy >= %s
              AND NOT EXISTS (
                  SELECT 1
                  FROM booking b
                  WHERE b.room_id = r.room_id
                    AND b.status IN ('confirmed', 'checked_out')
                    AND daterange(
                        b.check_in,
                        b.check_out,
                        '[)'
                    ) &&
                    daterange(
                        %s,
                        %s,
                        '[)'
                    )
              )
            ORDER BY r.property_id, r.room_number;
            """,
            (
                guest_count,
                check_in,
                check_out
            )
        )

        rows = cursor.fetchall()

        return [
            {
                "room_id": row[0],
                "property_id": row[1],
                "room_number": row[2],
                "room_type_id": row[3],
                "max_occupancy": row[4],
                "price_per_night": row[5]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()