from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    path('', views.ListChatsAPI.as_view(), name='chat_list'),
    path('room/<str:room_name>/', views.ChatHistoryAPI.as_view(), name='chat_room'),
    path('room/<str:room_name>/upload/', views.UploadAttachmentAPI.as_view(), name='upload_attachment'),
    path('start/<int:user_id>/', views.StartChatAPI.as_view(), name='start_chat'),
    path('users/search/', views.SearchUsersAPI.as_view(), name='search_users'),
]
