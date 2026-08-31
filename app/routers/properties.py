from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_connection
from app.dependencies import require_roles
from app.schemas.property import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse
)


router = APIRouter(
    prefix="/properties",
    tags=["properties"]
)


# GET all properties
@router.get(
    "",
    response_model=list[PropertyResponse]
)
def get_properties():

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                property_id,
                name,
                city,
                stars
            FROM property
            ORDER BY property_id;
            """
        )

        rows = cursor.fetchall()

        return [
            {
                "property_id": row[0],
                "name": row[1],
                "city": row[2],
                "stars": row[3]
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()


# GET one property
@router.get(
    "/{property_id}",
    response_model=PropertyResponse
)
def get_property(property_id: int):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                property_id,
                name,
                city,
                stars
            FROM property
            WHERE property_id = %s;
            """,
            (property_id,)
        )

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        return {
            "property_id": row[0],
            "name": row[1],
            "city": row[2],
            "stars": row[3]
        }

    finally:
        cursor.close()
        connection.close()


# POST create property
@router.post(
    "",
    response_model=PropertyResponse,
    status_code=status.HTTP_201_CREATED
)
def create_property(
    property_data: PropertyCreate,
    current_user=Depends(
        require_roles("manager", "owner")
    )
):

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO property (
                name,
                city,
                stars
            )
            VALUES (%s, %s, %s)
            RETURNING
                property_id,
                name,
                city,
                stars;
            """,
            (
                property_data.name,
                property_data.city,
                property_data.stars
            )
        )

        row = cursor.fetchone()

        connection.commit()

        return {
            "property_id": row[0],
            "name": row[1],
            "city": row[2],
            "stars": row[3]
        }

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

@router.patch(
    "/{property_id}",
    response_model=PropertyResponse
)
def update_property(
    property_id: int,
    property_data: PropertyUpdate,
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
            SELECT
                property_id,
                name,
                city,
                stars
            FROM property
            WHERE property_id = %s;
            """,
            (property_id,)
        )

        existing_property = cursor.fetchone()

        if existing_property is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        # Manager can only update their own property
        if (
            current_user["role"] == "manager"
            and current_user["property_id"] != property_id
        ):
           raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this property"
    )

        # Make sure at least one field was supplied
        update_data = property_data.model_dump(
            exclude_unset=True
        )

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one field is required"
            )

        # Build update values
        name = update_data.get(
            "name",
            existing_property[1]
        )

        city = update_data.get(
            "city",
            existing_property[2]
        )

        stars = update_data.get(
            "stars",
            existing_property[3]
        )

        cursor.execute(
            """
            UPDATE property
            SET
                name = %s,
                city = %s,
                stars = %s
            WHERE property_id = %s
            RETURNING
                property_id,
                name,
                city,
                stars;
            """,
            (
                name,
                city,
                stars,
                property_id
            )
        )

        row = cursor.fetchone()

        connection.commit()

        return {
            "property_id": row[0],
            "name": row[1],
            "city": row[2],
            "stars": row[3]
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

@router.delete(
    "/{property_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_property(
    property_id: int,
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
            (property_id,)
        )

        row = cursor.fetchone()

        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        # Manager can only delete their own property
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
            DELETE FROM property
            WHERE property_id = %s;
            """,
            (property_id,)
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