from pydantic import BaseModel, ConfigDict, Field


class RoomTypeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type_name: str = Field(
        min_length=1,
        max_length=100
    )

    max_occupancy: int = Field(
        gt=0
    )


class RoomTypeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )

    max_occupancy: int | None = Field(
        default=None,
        gt=0
    )


class RoomTypeResponse(BaseModel):
    room_type_id: int
    type_name: str
    max_occupancy: int