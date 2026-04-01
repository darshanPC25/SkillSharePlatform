import json
from channels.generic.websocket import AsyncWebsocketConsumer

class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'video_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        # Handle whiteboard drawing events
        if message_type == 'whiteboard':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'whiteboard_draw',
                    'action': data.get('action'),
                    'tool': data.get('tool'),
                    'color': data.get('color'),
                    'size': data.get('size'),
                    'x': data.get('x'),
                    'y': data.get('y'),
                    'lastX': data.get('lastX'),
                    'lastY': data.get('lastY'),
                    'text': data.get('text'),
                    'sender': data.get('sender')
                }
            )
        elif message_type == 'whiteboard_clear':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'whiteboard_clear',
                    'sender': data.get('sender')
                }
            )

    async def whiteboard_draw(self, event):
        # Send whiteboard drawing data to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'whiteboard',
            'action': event.get('action'),
            'tool': event.get('tool'),
            'color': event.get('color'),
            'size': event.get('size'),
            'x': event.get('x'),
            'y': event.get('y'),
            'lastX': event.get('lastX'),
            'lastY': event.get('lastY'),
            'text': event.get('text'),
            'sender': event.get('sender')
        }))

    async def whiteboard_clear(self, event):
        # Send clear whiteboard command
        await self.send(text_data=json.dumps({
            'type': 'whiteboard_clear',
            'sender': event.get('sender')
        }))
