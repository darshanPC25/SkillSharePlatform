import json
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Per-user WebSocket for push notifications (incoming calls, etc.)
    Group name: notifications_{user_id}
    """

    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close()
            return

        self.user_id = self.scope['user'].id
        self.group_name = f'notifications_{self.user_id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        # Clients can send decline signal back
        data = json.loads(text_data)
        if data.get('type') == 'call_declined':
            caller_id = data.get('caller_id')
            room_id = data.get('room_id')
            if caller_id:
                await self.channel_layer.group_send(
                    f'notifications_{caller_id}',
                    {
                        'type': 'call_declined',
                        'receiver': self.scope['user'].username,
                        'room_id': room_id,
                    }
                )

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
