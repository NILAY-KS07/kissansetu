import sqlite3
from datetime import datetime, timezone
from uuid import uuid4


class BookingConflict(Exception):
    pass


class BookingRepository:
    def __init__(self, database):
        self.database = database

    def create(self, user_id, crop, quantity, centre_id, slot_start):
        booking_id = f"booking-{uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc).isoformat()

        try:
            with self.database.connect() as connection:
                connection.execute("BEGIN IMMEDIATE")
                slot_date = slot_start[:10]

                row = connection.execute(
                    """
                    SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token
                    FROM bookings
                    WHERE centre_id = ?
                    AND substr(slot_start, 1, 10) = ?
                    """,
                    (centre_id, slot_date),
                ).fetchone()

                token_number = row["next_token"]
                token_label = f"{centre_id[:3].upper()}-{slot_date.replace('-', '')}-{token_number:03d}"

                connection.execute(
                    """
                    INSERT INTO bookings (
                        id,
                        user_id,
                        crop,
                        quantity,
                        centre_id,
                        slot_start,
                        status,
                        token_number,
                        token_label,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        booking_id,
                        user_id,
                        crop,
                        quantity,
                        centre_id,
                        slot_start,
                        "reserved",
                        token_number,
                        token_label,
                        created_at,
                    ),
                )

                connection.commit()

        except sqlite3.IntegrityError as error:
            if "UNIQUE" in str(error).upper():
                raise BookingConflict("This slot is no longer available.") from error
            raise

        return {
            "id": booking_id,
            "status": "reserved",
            "crop": crop,
            "quantity": quantity,
            "centre_id": centre_id,
            "slot_start": slot_start,
            "token": token_label,
        }

    def for_user(self, user_id):
        with self.database.connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    id,
                    crop,
                    quantity,
                    centre_id,
                    slot_start,
                    status,
                    token_label,
                    created_at
                FROM bookings
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()

        return [dict(row) for row in rows]

    def queue_for_user(self, user_id):
        with self.database.connect() as connection:
            row = connection.execute(
                """
                SELECT
                    token_number,
                    token_label,
                    centre_id,
                    substr(slot_start, 1, 10) AS slot_date
                FROM bookings
                WHERE user_id = ?
                AND status = 'reserved'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()

            if not row:
                return {
                    "current": None,
                    "your_token": None,
                    "people_ahead": None,
                }

            ahead = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM bookings
                WHERE centre_id = ?
                AND substr(slot_start, 1, 10) = ?
                AND status = 'reserved'
                AND token_number < ?
                """,
                (
                    row["centre_id"],
                    row["slot_date"],
                    row["token_number"],
                ),
            ).fetchone()["count"]

        return {
            "current": None,
            "your_token": row["token_label"],
            "people_ahead": ahead,
            "centre_id": row["centre_id"],
            "date": row["slot_date"],
        }