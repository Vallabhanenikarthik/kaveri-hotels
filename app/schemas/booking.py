from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class BookingCreate(BaseModel):
    room_id: int
    check_in: date
    check_out: date
    guest_count: int = Field(gt=0)
    payment_method: Literal["cash", "card", "upi"]


class BookingResponse(BaseModel):
    booking_id: int
    guest_id: int
    room_id: int
    check_in: date
    check_out: date
    guest_count: int
    status: str
    nights: int
    price_per_night: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    payment_methods: list[str]