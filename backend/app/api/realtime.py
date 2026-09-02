import json
import threading

from flask import current_app

def register_socket(sock):
    @sock.route("/api/ws/queue")
    def queue_stream(ws):
        first_message = ws.receive()
        try:
            details = json.loads(first_message or "{}")
        except json.JSONDecodeError:
            details = {"token": first_message}
        token = str(details.get("token", ""))
        user_id = current_app.extensions["token_service"].identify(token.removeprefix("Bearer ").strip())
        if not user_id:
            ws.send('{"error":"unauthorized"}')
            return
        snapshot = current_app.extensions["booking_repository"].queue_for_user(user_id)
        snapshot["type"] = "queue.snapshot"
        snapshot["estimated_wait_minutes"] = current_app.extensions["queue_service"].estimate(snapshot["people_ahead"])
        ws.send(json.dumps(snapshot, separators=(",", ":")))
        centre_id = str(details.get("centre_id", "")).strip()
        slot_date = str(details.get("date", "")).strip()
        event_bus = current_app.extensions["event_bus"]
        stop = threading.Event()

        def publish_events():
            if not centre_id or not slot_date:
                return
            pubsub = event_bus.subscribe(f"queue:{centre_id}:{slot_date}")
            try:
                while not stop.is_set():
                    message = pubsub.get_message(timeout=1)
                    if message and message.get("data"):
                        ws.send(message["data"])
            finally:
                pubsub.close()

        publisher = threading.Thread(target=publish_events, daemon=True)
        publisher.start()
        while True:
            try:
                message = ws.receive()
                if message is None:
                    stop.set()
                    return
            except Exception:
                stop.set()
                return