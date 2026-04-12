from django.urls import re_path
from . import consumers
from .notification_consumer import NotificationConsumer

websocket_urlpatterns = [
    re_path(r'ws/video/(?P<room_id>[\w-]+)/$', consumers.VideoCallConsumer.as_asgi()),
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
    re_path(r'ws/waiting/(?P<room_id>[\w-]+)/$', consumers.WaitingRoomConsumer.as_asgi()),
]
