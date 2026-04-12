"""
Utility to push real-time Notifications to any user via Django Channels.
Import and call `push_notification(user, type, message, link)` from any view or signal.
"""
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from dashboard.models import Notification


def push_notification(recipient_user, notification_type, message, link=''):
    """
    Creates a persistent Notification record in the DB and immediately
    pushes it to the user's live WebSocket channel if they're online.
    """
    notification = Notification.objects.create(
        recipient=recipient_user,
        notification_type=notification_type,
        message=message,
        link=link,
    )

    payload = {
        'id': notification.id,
        'type': notification.notification_type,
        'message': notification.message,
        'link': notification.link,
        'is_read': notification.is_read,
        'created_at': notification.created_at.isoformat(),
    }

    channel_layer = get_channel_layer()
    group_name = f'notifications_user_{recipient_user.id}'

    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'send_notification',
                'notification': payload
            }
        )
    except Exception as e:
        # User might not be connected — notification is still saved in DB
        print(f"[Notification] Could not push live to {recipient_user.username}: {e}")

    return notification
