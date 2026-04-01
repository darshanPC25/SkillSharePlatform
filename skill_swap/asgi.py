"""
ASGI config for skill_swap project.
"""
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skill_swap.settings')

django_asgi_app = get_asgi_application()

from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from video.routing import websocket_urlpatterns as video_websocket_urlpatterns

# Combine all websocket URL patterns
websocket_urlpatterns = chat_websocket_urlpatterns + video_websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})
