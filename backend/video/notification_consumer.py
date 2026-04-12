import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class NotificationConsumer(AsyncWebsocketConsumer):
    """
    A personal WebSocket channel for each logged-in user.
    Handles general notifications AND WebRTC call signals.
    """

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.user = user
        # Bind to standard notifications group
        self.group_notif = f'notifications_user_{user.id}'
        # Bind to WebRTC call signal group
        self.group_call = f'notifications_{user.id}'

        await self.channel_layer.group_add(self.group_notif, self.channel_name)
        await self.channel_layer.group_add(self.group_call, self.channel_name)
        await self.accept()

        # Send any unread notifications on connect
        unread = await self.get_unread_notifications()
        await self.send(text_data=json.dumps({
            'type': 'initial_notifications',
            'notifications': unread
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_notif'):
            await self.channel_layer.group_discard(self.group_notif, self.channel_name)
            await self.channel_layer.group_discard(self.group_call, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        data_type = data.get('type')

        if action == 'mark_read':
            notification_id = data.get('id')
            await self.mark_notification_read(notification_id)
        elif action == 'mark_all_read':
            await self.mark_all_read()
        elif data_type == 'call_declined':
            caller_id = data.get('caller_id')
            room_id = data.get('room_id')
            if caller_id:
                await self.channel_layer.group_send(
                    f'notifications_{caller_id}',
                    {
                        'type': 'call_declined',
                        'receiver': self.user.username,
                        'room_id': room_id,
                    }
                )

    # --- Channel Layer Handlers ---

    async def send_notification(self, event):
        """Called by group_send from Django views/signals."""
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'notification': event['notification']
        }))

    async def incoming_call(self, event):
        """Push incoming call notification to receiver."""
        await self.send(text_data=json.dumps({
            'type': 'incoming_call',
            'caller': event['caller'],
            'caller_id': event['caller_id'],
            'room_id': event['room_id'],
            'room_url': event['room_url'],
        }))

    async def call_declined(self, event):
        """Tell the caller their call was declined."""
        await self.send(text_data=json.dumps({
            'type': 'call_declined',
            'receiver': event['receiver'],
            'room_id': event['room_id'],
        }))

    # --- DB Helpers ---

    @database_sync_to_async
    def get_unread_notifications(self):
        from dashboard.models import Notification
        qs = Notification.objects.filter(recipient=self.user, is_read=False)[:20]
        return [{
            'id': n.id,
            'type': n.notification_type,
            'message': n.message,
            'link': n.link,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat(),
        } for n in qs]

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from dashboard.models import Notification
        Notification.objects.filter(id=notification_id, recipient=self.user).update(is_read=True)

    @database_sync_to_async
    def mark_all_read(self):
        from dashboard.models import Notification
        Notification.objects.filter(recipient=self.user, is_read=False).update(is_read=True)
