import re


class ValidationError(ValueError):
    pass


def normalize_email(value):
    email = str(value or "").strip().lower()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValidationError("Enter a valid email address.")
    return email


def validate_registration(payload):
    name = str(payload.get("name", "")).strip()
    mobile = re.sub(r"\D", "", str(payload.get("mobile", "")))[-10:]
    email = normalize_email(payload.get("email"))
    password = str(payload.get("password", ""))
    confirm_password = str(payload.get("confirm_password", ""))
    if len(name) < 2:
        raise ValidationError("Name must contain at least 2 characters.")
    if not re.fullmatch(r"\d{10}", mobile):
        raise ValidationError("Mobile number must contain 10 digits.")
    if len(password) < 8:
        raise ValidationError("Password must contain at least 8 characters.")
    if password != confirm_password:
        raise ValidationError("Passwords must match.")
    return name, mobile, email, password


def validate_login(payload):
    mobile = re.sub(r"\D", "", str(payload.get("mobile", "")))[-10:]
    password = str(payload.get("password", ""))
    if not re.fullmatch(r"\d{10}", mobile) or not password:
        raise ValidationError("Enter a valid mobile number and password.")
    return mobile, password
