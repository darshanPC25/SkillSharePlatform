from django.contrib import admin
from .models import ChatRoom, Message

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'room', 'content', 'timestamp']
    list_filter = ['timestamp']
