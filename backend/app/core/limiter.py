"""
Shared rate limiter instance — imported by both main.py and endpoint routers.
Keeping it here avoids circular imports between main.py and the auth endpoint.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
