from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    booking_id: int
    amount: float = Field(gt=0)
    method: Literal["cash", "card", "upi"]


class PaymentResponse(BaseModel):
    payment_id: int
    booking_id: int
    amount: float
    method: str
    payment_date: date