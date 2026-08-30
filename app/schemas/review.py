from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    review_id: int
    booking_id: int
    rating: int
    comment: str | None
    review_date: date | None

class PropertyReviewSummary(BaseModel):
    property_id: int
    review_count: int
    average_rating: float | None