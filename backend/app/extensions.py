from .repositories.user_repository import UserRepository
from .repositories.booking_repository import BookingRepository
from .services.auth_service import AuthService
from .services.queue_service import QueueService
from .services.token_service import TokenService
from .services.otp_service import OtpService
from .services.event_bus import EventBus


def configure_extensions(app):
	database = app.extensions["database"]
	user_repository = UserRepository(database)
	event_bus = EventBus(app.config["REDIS_URL"])
	booking_repository = BookingRepository(database, event_bus)
	token_service = TokenService(database, app.config["SESSION_TTL_SECONDS"])
	app.extensions["user_repository"] = user_repository
	app.extensions["booking_repository"] = booking_repository
	app.extensions["queue_service"] = QueueService()
	app.extensions["auth_service"] = AuthService(user_repository)
	app.extensions["token_service"] = token_service
	app.extensions["otp_service"] = OtpService(database, user_repository, app.config)
	app.extensions["event_bus"] = event_bus
