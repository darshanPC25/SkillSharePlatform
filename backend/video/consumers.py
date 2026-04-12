import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache

@database_sync_to_async
def is_user_in_cache(cache_key):
    return cache.get(cache_key)

@database_sync_to_async
def set_user_in_cache(cache_key):
    cache.set(cache_key, True, timeout=86400)

@database_sync_to_async
def remove_user_from_cache(cache_key):
    cache.delete(cache_key)

class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close()
            return

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'video_{self.room_id}'
        self.username = self.scope['user'].username
        
        self.cache_key = f'active_user_{self.room_id}_{self.username}'
        is_active = await is_user_in_cache(self.cache_key)
        if is_active:
            await self.accept()
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Someone with this ID has already joined the room.'}))
            await self.close(code=4000)
            return
            
        await set_user_in_cache(self.cache_key)

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_joined',
                'sender': self.username,
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'username') and hasattr(self, 'cache_key'):
            await remove_user_from_cache(self.cache_key)
            
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        if hasattr(self, 'username'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'participant_left',
                    'sender': self.username,
                }
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type in {'offer', 'answer', 'ice_candidate', 'end_call'}:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_signal',
                    'signal_type': message_type,
                    'payload': data.get('payload'),
                    'sender': self.username,
                    'target': data.get('target')  # Target explicit user for Mesh signaling
                }
            )
            return

        # Handle text chat
        if message_type == 'chat':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': data.get('message'),
                    'sender': self.username,
                }
            )
            return
        
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
            return

        # Handle code editor changes
        if message_type == 'code_change':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'code_change',
                    'code': data.get('code'),
                    'sender': self.username
                }
            )
            return

        if message_type == 'code_output':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'code_output',
                    'output': data.get('output'),
                    'sender': self.username
                }
            )
            return

        if message_type == 'whiteboard_page':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'whiteboard_page',
                    'action': data.get('action'),
                    'pageIndex': data.get('pageIndex'),
                    'totalPages': data.get('totalPages'),
                    'sender': self.username
                }
            )
            return

        if message_type == 'poll_update':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'poll_update',
                    'pollData': data.get('pollData'),
                    'msgId': data.get('pollData', {}).get('msgId'),
                    'sender': self.username
                }
            )
            return

        # --- Waiting Room / Admit System ---

        # Host: receive an admission request from a waiting user
        if message_type == 'admit_request':
            # Broadcast to everyone in the room so the host sees it
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'admit_request',
                    'username': data.get('username'),
                    'display_name': data.get('display_name', data.get('username')),
                }
            )
            return

        # Host → waiting user: ADMITTED
        if message_type == 'admit_user':
            target_username = data.get('username')
            # Notify the specific user's waiting group
            await self.channel_layer.group_send(
                f'waiting_{self.room_id}_{target_username}',
                {
                    'type': 'admission_result',
                    'result': 'admitted',
                    'room_id': self.room_id,
                }
            )
            # Also announce to main room who was admitted
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'participant_admitted',
                    'username': target_username,
                }
            )
            return

        # Host → waiting user: DENIED
        if message_type == 'deny_user':
            target_username = data.get('username')
            await self.channel_layer.group_send(
                f'waiting_{self.room_id}_{target_username}',
                {
                    'type': 'admission_result',
                    'result': 'denied',
                    'room_id': self.room_id,
                }
            )
            return

        if message_type == 'session_ended':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'session_ended_event',
                    'sender': self.username
                }
            )
            return

    async def session_ended_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'session_ended',
            'sender': event.get('sender')
        }))

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

    async def whiteboard_page(self, event):
        await self.send(text_data=json.dumps({
            'type': 'whiteboard_page',
            'action': event.get('action'),
            'pageIndex': event.get('pageIndex'),
            'totalPages': event.get('totalPages'),
            'sender': event.get('sender')
        }))

    async def poll_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'poll_update',
            'pollData': event.get('pollData'),
            'msgId': event.get('msgId'),
            'sender': event.get('sender')
        }))

    async def code_change(self, event):
        await self.send(text_data=json.dumps({
            'type': 'code_change',
            'code': event.get('code'),
            'sender': event.get('sender')
        }))

    async def code_output(self, event):
        await self.send(text_data=json.dumps({
            'type': 'code_output',
            'output': event.get('output'),
            'sender': event.get('sender')
        }))

    async def participant_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'participant_joined',
            'sender': event.get('sender')
        }))

    async def participant_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'participant_left',
            'sender': event.get('sender')
        }))

    async def webrtc_signal(self, event):
        # Only send if the user is the intended target, or if there's no target (broadcast)
        target = event.get('target')
        if target and target != self.username and self.username != event.get('sender'):
            return # Ignore signals meant for other peers in mesh
            
        # Prevent echoing back to sender
        if self.username == event.get('sender'):
            return

        await self.send(text_data=json.dumps({
            'type': event.get('signal_type'),
            'payload': event.get('payload'),
            'sender': event.get('sender')
        }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'message': event.get('message'),
            'sender': event.get('sender')
        }))

    async def admit_request(self, event):
        """Relay a knock-to-join request to all participants (primarily the host) in the room."""
        await self.send(text_data=json.dumps({
            'type': 'admit_request',
            'username': event.get('username'),
            'display_name': event.get('display_name'),
        }))

    async def participant_admitted(self, event):
        """Announce to the main room that someone has been admitted."""
        await self.send(text_data=json.dumps({
            'type': 'participant_admitted',
            'username': event.get('username'),
        }))


class WaitingRoomConsumer(AsyncWebsocketConsumer):
    """
    Personal WebSocket channel for a user waiting to be admitted into a class.
    Connects to a unique group: waiting_{room_id}_{username}
    Listens for 'admission_result' (admitted | denied) from the host.
    """

    async def connect(self):
        if not self.scope['user'].is_authenticated:
            await self.close()
            return

        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.username = self.scope['user'].username
        self.waiting_group = f'waiting_{self.room_id}_{self.username}'

        await self.channel_layer.group_add(self.waiting_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'waiting_group'):
            await self.channel_layer.group_discard(self.waiting_group, self.channel_name)

    async def receive(self, text_data):
        # Waiting users don't send events — they only listen
        pass

    async def admission_result(self, event):
        """Called by group_send when the host admits or denies this user."""
        await self.send(text_data=json.dumps({
            'type': 'admission_result',
            'result': event.get('result'),   # 'admitted' or 'denied'
            'room_id': event.get('room_id'),
        }))
        await self.close()
