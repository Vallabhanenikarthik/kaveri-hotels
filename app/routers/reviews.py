from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_connection
from app.dependencies import get_current_user
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    PropertyReviewSummary
)


router = APIRouter(
    prefix="/reviews",
    tags=["reviews"]
)
@router.post(
    "",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED
)
def create_review(
    review_data: ReviewCreate,
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
                status,
                check_in,
                check_out
            FROM booking
            WHERE booking_id = %s;
            """,
            (review_data.booking_id,)
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
            check_in,
            check_out
        ) = booking

        # --------------------------------------------------
        # 2. Guest can only review their own booking
        # --------------------------------------------------

        if current_user["role"] == "guest":

            if guest_id != current_user["guest_id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only review your own bookings"
                )

        # --------------------------------------------------
        # 3. Booking must be confirmed
        # --------------------------------------------------

        if booking_status != "checked_out":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can review a booking only after checkout"
            )

        # --------------------------------------------------
        # 4. Stay must be completed
        # --------------------------------------------------

        if check_out >= date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can review a booking only after your stay is completed"
            )

        # --------------------------------------------------
        # 5. Check whether a review already exists
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT review_id
            FROM review
            WHERE booking_id = %s;
            """,
            (booking_id,)
        )

        existing_review = cursor.fetchone()

        if existing_review is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This booking has already been reviewed"
            )

        # --------------------------------------------------
        # 6. Create review
        # --------------------------------------------------

        cursor.execute(
            """
            INSERT INTO review (
                booking_id,
                rating,
                comment,
                review_date
            )
            VALUES (%s, %s, %s, %s)
            RETURNING
                review_id,
                booking_id,
                rating,
                comment,
                review_date;
            """,
            (
                booking_id,
                review_data.rating,
                review_data.comment,
                date.today()
            )
        )

        row = cursor.fetchone()

        # --------------------------------------------------
        # 7. Commit
        # --------------------------------------------------

        connection.commit()

        return {
            "review_id": row[0],
            "booking_id": row[1],
            "rating": row[2],
            "comment": row[3],
            "review_date": row[4]
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
    response_model=list[ReviewResponse]
)
def get_reviews(
    current_user=Depends(get_current_user)
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # 1. Guest → only their own reviews
        # --------------------------------------------------

        if current_user["role"] == "guest":

            cursor.execute(
                """
                SELECT
                    r.review_id,
                    r.booking_id,
                    r.rating,
                    r.comment,
                    r.review_date
                FROM review r
                JOIN booking b
                    ON b.booking_id = r.booking_id
                WHERE b.guest_id = %s
                ORDER BY r.review_id;
                """,
                (current_user["guest_id"],)
            )

        # --------------------------------------------------
        # 2. Manager → reviews for their property
        # --------------------------------------------------

        elif current_user["role"] == "manager":

            cursor.execute(
                """
                SELECT
                    r.review_id,
                    r.booking_id,
                    r.rating,
                    r.comment,
                    r.review_date
                FROM review r
                JOIN booking b
                    ON b.booking_id = r.booking_id
                JOIN room rm
                    ON rm.room_id = b.room_id
                WHERE rm.property_id = %s
                ORDER BY r.review_id;
                """,
                (current_user["property_id"],)
            )

        # --------------------------------------------------
        # 3. Owner → all reviews
        # --------------------------------------------------

        elif current_user["role"] == "owner":

            cursor.execute(
                """
                SELECT
                    r.review_id,
                    r.booking_id,
                    r.rating,
                    r.comment,
                    r.review_date
                FROM review r
                ORDER BY r.review_id;
                """
            )

        # --------------------------------------------------
        # 4. Other roles → forbidden
        # --------------------------------------------------

        else:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view reviews"
            )

        rows = cursor.fetchall()

        return [
            {
                "review_id": row[0],
                "booking_id": row[1],
                "rating": row[2],
                "comment": row[3],
                "review_date": row[4]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()
@router.get(
    "/property/{property_id}",
    response_model=PropertyReviewSummary
)
def get_property_review_summary(
    property_id: int,
    current_user=Depends(get_current_user)
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        # --------------------------------------------------
        # 1. Check property exists
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT property_id
            FROM property
            WHERE property_id = %s;
            """,
            (property_id,)
        )

        property_row = cursor.fetchone()

        if property_row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        # --------------------------------------------------
        # 2. Get review summary
        # --------------------------------------------------

        cursor.execute(
            """
            SELECT
                COUNT(r.review_id),
                ROUND(AVG(r.rating), 2)
            FROM review r
            JOIN booking b
                ON b.booking_id = r.booking_id
            JOIN room rm
                ON rm.room_id = b.room_id
            WHERE rm.property_id = %s;
            """,
            (property_id,)
        )

        row = cursor.fetchone()

        review_count = row[0]
        average_rating = row[1]

        return {
            "property_id": property_id,
            "review_count": review_count,
            "average_rating": average_rating
        }

    finally:
        cursor.close()
        connection.close()