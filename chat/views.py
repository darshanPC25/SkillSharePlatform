from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Q
from .models import ChatRoom, Message

@login_required
def chat_list(request):
    rooms = request.user.chat_rooms.all()
    return render(request, 'chat/chat_list.html', {'rooms': rooms})

@login_required
def chat_room(request, room_name):
    room = get_object_or_404(ChatRoom, name=room_name, participants=request.user)
    chat_messages = room.messages.all().select_related('sender')
    
    # Mark messages as read
    Message.objects.filter(room=room).exclude(sender=request.user).update(is_read=True)
    
    # Get other participant
    other_user = room.participants.exclude(id=request.user.id).first()
    
    context = {
        'room': room,
        'chat_messages': chat_messages,
        'other_user': other_user,
    }
    return render(request, 'chat/chat_room.html', context)

@login_required
def start_chat(request, user_id):
    other_user = get_object_or_404(User, id=user_id)
    if other_user == request.user:
        return redirect('chat:chat_list')
    
    # Create or get room name
    users_sorted = sorted([request.user.id, other_user.id])
    room_name = f'chat_{users_sorted[0]}_{users_sorted[1]}'
    
    room, created = ChatRoom.objects.get_or_create(name=room_name)
    if created:
        room.participants.add(request.user, other_user)
    
    return redirect('chat:chat_room', room_name=room_name)
