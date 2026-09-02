from datetime import datetime
from zoneinfo import ZoneInfo


class BookingValidationError(ValueError):
    pass


def validate_booking(payload, timezone_name="Asia/Kolkata"):
    crop = str(payload.get("crop", "")).strip()
    centre_id = str(payload.get("centre_id", "")).strip()
    slot_start = str(payload.get("slot_start", "")).strip()
    try:
        quantity = float(payload.get("quantity"))
    except (TypeError, ValueError):
        raise BookingValidationError("Quantity must be a positive number.")
    if not crop or not centre_id or not slot_start or quantity <= 0:
        raise BookingValidationError("Crop, centre, slot, and a positive quantity are required.")
    try:
        parsed_slot = datetime.fromisoformat(slot_start.replace("Z", "+00:00"))
        zone = ZoneInfo(timezone_name)
        if parsed_slot.tzinfo is None:
            parsed_slot = parsed_slot.replace(tzinfo=zone)
        slot_start = parsed_slot.astimezone(zone).isoformat()
    except ValueError as error:
        raise BookingValidationError("Slot start must be a valid ISO datetime.") from error
    return crop, quantity, centre_id, slot_start