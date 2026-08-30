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