from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_connection
from app.dependencies import get_current_user
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse
)


router = APIRouter(
    prefix="/payments",
    tags=["payments"]
)


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_payment(
    payment_data: PaymentCreate,
    current_user=Depends(get_current_user)
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # 1. Check booking exists and get room price
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                b.booking_id,
                b.guest_id,
                b.status,
                rt.price_per_night,
                b.check_in,
                b.check_out
            FROM booking b
            JOIN room r
                ON r.room_id = b.room_id
            JOIN room_type rt
                ON rt.room_type_id = r.room_type_id
            WHERE b.booking_id = %s;
            """,
            (payment_data.booking_id,)
        )

        booking = cursor.fetchone()

        if booking is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )

        (
            booking_id,
            guest_id,
            booking_status,
            price_per_night,
            check_in,
            check_out
        ) = booking

        # --------------------------------------------------
        # 2. Check guest owns the booking
        # --------------------------------------------------

        if current_user["role"] == "guest":
            if guest_id != current_user["guest_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only make payments for your own bookings"
                )

        # --------------------------------------------------
        # 3. Don't allow payment for cancelled booking
        # --------------------------------------------------

        if booking_status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot make payment for a cancelled booking"
            )

        # --------------------------------------------------
        # 4. Calculate total booking amount
        # --------------------------------------------------

        number_of_nights = (check_out - check_in).days

        total_amount = price_per_night * number_of_nights

        # --------------------------------------------------
        # 5. Calculate amount already paid
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0)
            FROM payment
            WHERE booking_id = %s;
            """,
            (booking_id,)
        )

        amount_paid = cursor.fetchone()[0]

        # --------------------------------------------------
        # 6. Calculate remaining balance
        # --------------------------------------------------

        remaining_amount = total_amount - amount_paid

        # --------------------------------------------------
        # 7. Validate payment amount
        # --------------------------------------------------

        if payment_data.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be greater than 0"
            )

        if payment_data.amount > remaining_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment exceeds remaining balance of {remaining_amount}"
            )

        # --------------------------------------------------
        # 8. Insert payment
        # --------------------------------------------------

        cursor.execute(
            """
            INSERT INTO payment (
                booking_id,
                amount,
                method,
                payment_date
            )
            VALUES (%s, %s, %s, %s)
            RETURNING
                payment_id,
                booking_id,
                amount,
                method,
                payment_date;
            """,
            (
                booking_id,
                payment_data.amount,
                payment_data.method,
                date.today()
            )
        )

        row = cursor.fetchone()

        # --------------------------------------------------
        # 9. Commit
        # --------------------------------------------------

        connection.commit()

        return {
            "payment_id": row[0],
            "booking_id": row[1],
            "amount": row[2],
            "method": row[3],
            "payment_date": row[4]
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

@router.get(
    "",
    response_model=list[PaymentResponse]
)
def get_payments(
    current_user=Depends(get_current_user)
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # Guest → only their own payments
        # --------------------------------------------------

        if current_user["role"] == "guest":

            cursor.execute(
                """
                SELECT
                    p.payment_id,
                    p.booking_id,
                    p.amount,
                    p.method,
                    p.payment_date
                FROM payment p
                JOIN booking b
                    ON b.booking_id = p.booking_id
                WHERE b.guest_id = %s
                ORDER BY p.payment_id;
                """,
                (current_user["guest_id"],)
            )

        # --------------------------------------------------
        # Manager → payments for their property
        # --------------------------------------------------

        elif current_user["role"] == "manager":

            cursor.execute(
                """
                SELECT
                    p.payment_id,
                    p.booking_id,
                    p.amount,
                    p.method,
                    p.payment_date
                FROM payment p
                JOIN booking b
                    ON b.booking_id = p.booking_id
                JOIN room r
                    ON r.room_id = b.room_id
                WHERE r.property_id = %s
                ORDER BY p.payment_id;
                """,
                (current_user["property_id"],)
            )

        # --------------------------------------------------
        # Admin/owner → all payments
        # --------------------------------------------------

        else:

            cursor.execute(
                """
                SELECT
                    payment_id,
                    booking_id,
                    amount,
                    method,
                    payment_date
                FROM payment
                ORDER BY payment_id;
                """
            )

        rows = cursor.fetchall()

        return [
            {
                "payment_id": row[0],
                "booking_id": row[1],
                "amount": row[2],
                "method": row[3],
                "payment_date": row[4]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()

@router.get(
    "/{payment_id}",
    response_model=PaymentResponse
)
def get_payment(
    payment_id: int,
    current_user=Depends(get_current_user)
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # 1. Get payment and related booking guest
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                p.payment_id,
                p.booking_id,
                p.amount,
                p.method,
                p.payment_date,
                b.guest_id
            FROM payment p
            JOIN booking b
                ON b.booking_id = p.booking_id
            WHERE p.payment_id = %s;
            """,
            (payment_id,)
        )

        payment = cursor.fetchone()

        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        (
            payment_id,
            booking_id,
            amount,
            method,
            payment_date,
            guest_id
        ) = payment

        # --------------------------------------------------
        # 2. Guest can only view their own payment
        # --------------------------------------------------

        if current_user["role"] == "guest":
            if guest_id != current_user["guest_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view payments for your own bookings"
                )

        # --------------------------------------------------
        # 3. Return payment
        # --------------------------------------------------

        return {
            "payment_id": payment_id,
            "booking_id": booking_id,
            "amount": amount,
            "method": method,
            "payment_date": payment_date
        }

    finally:
        cursor.close()
        connection.close()