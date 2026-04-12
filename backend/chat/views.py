from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer, SimpleUserSerializer

class ListChatsAPI(generics.ListAPIView):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.chat_rooms.all()

class ChatHistoryAPI(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_name = self.kwargs['room_name']
        room = get_object_or_404(ChatRoom, name=room_name, participants=self.request.user)
        # Mark messages as read
        Message.objects.filter(room=room).exclude(sender=self.request.user).update(is_read=True)
        return room.messages.all().select_related('sender')

class StartChatAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        other_user = get_object_or_404(User, id=user_id)
        if other_user == request.user:
            return Response({'error': 'Cannot chat with yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        users_sorted = sorted([request.user.id, other_user.id])
        room_name = f'chat_{users_sorted[0]}_{users_sorted[1]}'
        
        room, created = ChatRoom.objects.get_or_create(name=room_name)
        if created:
            room.participants.add(request.user, other_user)
            
        serializer = ChatRoomSerializer(room, context={'request': request})
        return Response(serializer.data)

class SearchUsersAPI(generics.ListAPIView):
    serializer_class = SimpleUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        if query:
            return User.objects.filter(
                Q(username__icontains=query) | 
                Q(first_name__icontains=query) | 
                Q(last_name__icontains=query)
            ).exclude(id=self.request.user.id)[:10]
        # Default return all minus self
        return User.objects.exclude(id=self.request.user.id)[:20]

class UploadAttachmentAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_name):
        room = get_object_or_404(ChatRoom, name=room_name, participants=request.user)
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=400)
            
        # Create a message with the attachment
        message = Message.objects.create(
            room=room,
            sender=request.user,
            content='', # No text content for pure uploads, or could take an optional caption
            attachment=file
        )
        
        # We need to broadcast this message to the WebSocket group via Django Channels
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        serializer = MessageSerializer(message)
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{room_name}',
            {
                'type': 'chat_message',
                'message': serializer.data
            }
        )
        
        return Response(serializer.data, status=201)
