from pydantic import BaseModel, ConfigDict, Field


class PropertyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    stars: int = Field(ge=1, le=5)

class PropertyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200
    )

    city: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )

    stars: int | None = Field(
        default=None,
        ge=1,
        le=5
    )

class PropertyResponse(BaseModel):
    property_id: int
    name: str
    city: str
    stars: int