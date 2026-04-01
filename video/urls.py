from django.urls import path
from . import views

app_name = 'video'

urlpatterns = [
    path('', views.video_call_list, name='call_list'),
    path('start/<int:user_id>/', views.start_call, name='start_call'),
    path('room/<str:room_id>/', views.video_room, name='video_room'),
    path('end/<str:room_id>/', views.end_call, name='end_call'),
    path('rate/<str:room_id>/', views.submit_call_rating, name='submit_call_rating'),
]
