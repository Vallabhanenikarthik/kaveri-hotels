from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2.errors import ExclusionViolation

from app.database import get_connection
from app.dependencies import get_current_user
from app.schemas.booking import (
    BookingCreate,
    BookingResponse
)

router = APIRouter(
    prefix="/bookings",
    tags=["bookings"]
)


@router.get(
    "",
    response_model=list[BookingResponse]
)
def get_bookings(
    status_filter: str | None = None,
    limit: int = 10,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 100"
        )

    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset must be greater than or equal to 0"
        )

    allowed_statuses = {
        "confirmed",
        "cancelled",
        "checked_out",
        "no_show"
    }

    if status_filter is not None and status_filter not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking status"
        )

    connection = get_connection()

    try:
        cursor = connection.cursor()

        query = """
            SELECT
                b.booking_id,
                b.guest_id,
                b.room_id,
                b.check_in,
                b.check_out,
                b.guest_count,
                b.status,
                rt.price_per_night,
                COALESCE(pay.amount_paid, 0) AS amount_paid,
                COALESCE(
                    pay.payment_methods,
                    ARRAY[]::varchar[]
                ) AS payment_methods
            FROM booking b
            JOIN room r
                ON r.room_id = b.room_id
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            LEFT JOIN (
                SELECT
                    booking_id,
                    SUM(amount) AS amount_paid,
                    ARRAY_AGG(DISTINCT method::varchar)
                        AS payment_methods
                FROM payment
                GROUP BY booking_id
            ) pay
                ON pay.booking_id = b.booking_id
            WHERE 1 = 1
        """

        params = []

        # ---------------------------------------------
        # Role-based access
        # ---------------------------------------------

        if current_user["role"] == "guest":
            query += """
                AND b.guest_id = %s
            """
            params.append(current_user["guest_id"])

        elif current_user["role"] == "manager":
            query += """
                AND r.property_id = %s
            """
            params.append(current_user["property_id"])

        # Owner sees all bookings

        # ---------------------------------------------
        # Optional status filter
        # ---------------------------------------------

        if status_filter is not None:
            query += """
                AND b.status = %s
            """
            params.append(status_filter)

        # ---------------------------------------------
        # Deterministic ordering + pagination
        # ---------------------------------------------

        query += """
            ORDER BY b.booking_id DESC
            LIMIT %s
            OFFSET %s;
        """

        params.extend([limit, offset])

        cursor.execute(query, tuple(params))

        rows = cursor.fetchall()

        return [
            {
                "booking_id": row[0],
                "guest_id": row[1],
                "room_id": row[2],
                "check_in": row[3],
                "check_out": row[4],
                "guest_count": row[5],
                "status": row[6],
                "nights": (row[4] - row[3]).days,
                "price_per_night": row[7],
                "total_amount": row[7] * (row[4] - row[3]).days,
                "amount_paid": row[8],
                "payment_methods": row[9]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED
)
def create_booking(
    booking_data: BookingCreate,
    current_user=Depends(get_current_user)
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # 1. Only guests can create bookings
        # --------------------------------------------------

        if current_user["role"] != "guest":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only guests can create bookings"
            )

        guest_id = current_user["guest_id"]

        # --------------------------------------------------
        # --------------------------------------------------

        if booking_data.check_in >= booking_data.check_out:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="check_in must be before check_out"
            )

        # --------------------------------------------------
        # 3. Check room exists and get capacity
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                r.room_id,
                r.property_id,
                rt.max_occupancy,
                rt.price_per_night
            FROM room r
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            WHERE r.room_id = %s;
            """,
            (booking_data.room_id,)
        )

        room = cursor.fetchone()

        if room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )

        room_id, property_id, max_occupancy, price_per_night = room

        # --------------------------------------------------
        # 4. Check guest count against room capacity
        # --------------------------------------------------

        if booking_data.guest_count > max_occupancy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room allows maximum {max_occupancy} guests"
            )
        number_of_nights = (
            booking_data.check_out - booking_data.check_in
        ).days

        total_amount = price_per_night * number_of_nights

# 20% deposit
        deposit_amount = total_amount * Decimal("0.20")

        # --------------------------------------------------
        # 5. Create booking
        # --------------------------------------------------

        cursor.execute(
            """
            INSERT INTO booking (
                guest_id,
                room_id,
                check_in,
                check_out,
                guest_count,
                status
            )
            VALUES (%s, %s, %s, %s, %s, 'confirmed')
            RETURNING
                booking_id,
                guest_id,
                room_id,
                check_in,
                check_out,
                guest_count,
                status;
            """,
            (
                guest_id,
                booking_data.room_id,
                booking_data.check_in,
                booking_data.check_out,
                booking_data.guest_count
            )
        )

        row = cursor.fetchone()

# --------------------------------------------------
# Create deposit payment
# --------------------------------------------------

        cursor.execute(
         """
        INSERT INTO payment (
            booking_id,
            amount,
            method,
            payment_date
        )
        VALUES (%s, %s, %s, %s);
        """,
        (
            row[0],
            deposit_amount,
            booking_data.payment_method,
            date.today()
        )
    )
        # TEMPORARY TEST
    
        connection.commit()

        return {
            "booking_id": row[0],
            "guest_id": row[1],
            "room_id": row[2],
            "check_in": row[3],
            "check_out": row[4],
            "guest_count": row[5],
            "status": row[6],
            "nights": number_of_nights,
            "price_per_night": price_per_night,
            "total_amount": total_amount,
            "amount_paid": deposit_amount,
            "payment_methods": [booking_data.payment_method]
        }

    except ExclusionViolation:
        connection.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is already booked for the selected dates"
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
    "/{booking_id}",
    response_model=BookingResponse
)
def get_booking(
    booking_id: int,
    current_user=Depends(get_current_user)
):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
    """
    SELECT
        b.booking_id,
        b.guest_id,
        b.room_id,
        b.check_in,
        b.check_out,
        b.guest_count,
        b.status,
        rt.price_per_night,
        COALESCE(pay.amount_paid, 0) AS amount_paid,
        COALESCE(pay.payment_methods, ARRAY[]::varchar[]) AS payment_methods
    FROM booking b
    JOIN room r
        ON r.room_id = b.room_id
    JOIN room_type rt
        ON rt.room_type_id = r.room_type_id
    LEFT JOIN (
        SELECT
            booking_id,
            SUM(amount) AS amount_paid,
            ARRAY_AGG(DISTINCT method::varchar) AS payment_methods
        FROM payment
        GROUP BY booking_id
    ) pay
        ON pay.booking_id = b.booking_id
    WHERE b.booking_id = %s;
    """,
    (booking_id,)
)

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        # --------------------------------------------------
        # Guest can only view their own booking
        # --------------------------------------------------

        if current_user["role"] == "guest":
            if row[1] != current_user["guest_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own bookings"
                )

        return {
    "booking_id": row[0],
    "guest_id": row[1],
    "room_id": row[2],
    "check_in": row[3],
    "check_out": row[4],
    "guest_count": row[5],
    "status": row[6],
    "nights": (row[4] - row[3]).days,
    "price_per_night": row[7],
    "total_amount": row[7] * (row[4] - row[3]).days,
    "amount_paid": row[8],
    "payment_methods": row[9]
}

    finally:
        cursor.close()
        connection.close()

@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    current_user=Depends(get_current_user)
):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # 1. Get booking details
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                booking_id,
                guest_id,
                status
            FROM booking
            WHERE booking_id = %s;
            """,
            (booking_id,)
        )

        booking = cursor.fetchone()

        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )

        booking_id, guest_id, booking_status = booking

        # --------------------------------------------------
        # 2. Guest can only cancel their own booking
        # --------------------------------------------------

        if current_user["role"] == "guest":

            if guest_id != current_user["guest_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only cancel your own bookings"
                )

        # --------------------------------------------------
        # 3. Don't cancel an already cancelled booking
        # --------------------------------------------------

        if booking_status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking is already cancelled"
            )

        # --------------------------------------------------
        # 4. Get all payments for this booking
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                payment_id,
                amount
            FROM payment
            WHERE booking_id = %s
            ORDER BY payment_id;
            """,
            (booking_id,)
        )

        payments = cursor.fetchall()

        # --------------------------------------------------
        # 5. Create refund for every payment
        # --------------------------------------------------

        for payment_id, amount in payments:

            cursor.execute(
                """
                INSERT INTO refund (
                    booking_id,
                    payment_id,
                    amount
                )
                VALUES (%s, %s, %s);
                """,
                (
                    booking_id,
                    payment_id,
                    amount
                )
            )
        # --------------------------------------------------
        # 6. Cancel booking
        # --------------------------------------------------

        cursor.execute(
            """
            UPDATE booking b
            SET status = 'cancelled'
            FROM room r
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            WHERE b.booking_id = %s
                AND r.room_id = b.room_id
            RETURNING
                b.booking_id,
                b.guest_id,
                b.room_id,
                b.check_in,
                b.check_out,
                b.guest_count,
                b.status,
                rt.price_per_night,
                COALESCE(
                    (
                        SELECT SUM(amount)
                        FROM payment
                        WHERE booking_id = b.booking_id
                    ),
                    0
                ) AS amount_paid,
                COALESCE(
                    (
                        SELECT ARRAY_AGG(DISTINCT method::varchar)
                        FROM payment
                        WHERE booking_id = b.booking_id
                    ),
                    ARRAY[]::varchar[]
                ) AS payment_methods;
            """,
            (booking_id,)
        )

        row = cursor.fetchone()

        # --------------------------------------------------
        # 7. Commit everything
        # --------------------------------------------------

        connection.commit()

        return {
            "booking_id": row[0],
            "guest_id": row[1],
            "room_id": row[2],
            "check_in": row[3],
            "check_out": row[4],
            "guest_count": row[5],
            "status": row[6],
            "nights": (row[4] - row[3]).days,
            "price_per_night": row[7],
            "total_amount": row[7] * (row[4] - row[3]).days,
            "amount_paid": row[8],
            "payment_methods": row[9]
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
@router.post(
    "/{booking_id}/checkout",
    response_model=BookingResponse
)
def checkout_booking(
    booking_id: int,
    current_user=Depends(get_current_user)
):
    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # 1. Get booking details
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                b.booking_id,
                b.guest_id,
                b.status,
                b.check_out,
                COALESCE(SUM(p.amount), 0) AS amount_paid,
                rt.price_per_night
            FROM booking b
            JOIN room r
                ON r.room_id = b.room_id
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            LEFT JOIN payment p
                ON p.booking_id = b.booking_id
            WHERE b.booking_id = %s
            GROUP BY
                b.booking_id,
                b.guest_id,
                b.status,
                b.check_out,
                rt.price_per_night;
            """,
            (booking_id,)
        )

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )

        (
            booking_id,
            guest_id,
            booking_status,
            check_out,
            amount_paid,
            price_per_night
        ) = row

        # --------------------------------------------------
        # 2. Guest ownership
        # --------------------------------------------------

        if current_user["role"] == "guest":
            if guest_id != current_user["guest_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only check out your own bookings"
                )

        # --------------------------------------------------
        # 3. Booking must be confirmed
        # --------------------------------------------------

        if booking_status != "confirmed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot check out a booking with status '{booking_status}'"
            )

        # --------------------------------------------------
        # 4. Checkout date must have arrived
        # --------------------------------------------------

        if check_out > date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot check out before the checkout date"
            )

        # --------------------------------------------------
        # 5. Calculate total booking amount
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                (check_out - check_in) * rt.price_per_night
            FROM booking b
            JOIN room r
                ON r.room_id = b.room_id
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            WHERE b.booking_id = %s;
            """,
            (booking_id,)
        )

        total_amount = cursor.fetchone()[0]

        # --------------------------------------------------
        # 6. Booking must be fully paid
        # --------------------------------------------------

        if amount_paid < total_amount:
            remaining = total_amount - amount_paid

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Booking has an outstanding balance of {remaining}"
            )

        # --------------------------------------------------
        # 7. Mark booking as checked out
        # --------------------------------------------------

        cursor.execute(
            """
            UPDATE booking b
            SET status = 'checked_out'
            FROM room r
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            WHERE b.booking_id = %s
                AND r.room_id = b.room_id
            RETURNING
                b.booking_id,
                b.guest_id,
                b.room_id,
                b.check_in,
                b.check_out,
                b.guest_count,
                b.status,
                rt.price_per_night,
                COALESCE(
                    (
                        SELECT SUM(amount)
                        FROM payment
                        WHERE booking_id = b.booking_id
                    ),
                    0
                ) AS amount_paid,
                COALESCE(
                    (
                        SELECT ARRAY_AGG(DISTINCT method::varchar)
                        FROM payment
                        WHERE booking_id = b.booking_id
                    ),
                    ARRAY[]::varchar[]
                ) AS payment_methods;
            """,
            (booking_id,)
        )

        updated = cursor.fetchone()

        connection.commit()

        return {
            "booking_id": updated[0],
            "guest_id": updated[1],
            "room_id": updated[2],
            "check_in": updated[3],
            "check_out": updated[4],
            "guest_count": updated[5],
            "status": updated[6],
            "nights": (updated[4] - updated[3]).days,
            "price_per_night": updated[7],
            "total_amount": updated[7] * (updated[4] - updated[3]).days,
            "amount_paid": updated[8],
            "payment_methods": updated[9]
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
