from django.urls import path
from . import views

app_name = 'video'

urlpatterns = [
    path('', views.video_call_list, name='call_list'),
    path('start/<int:user_id>/', views.start_call, name='start_call'),
    path('room/<str:room_id>/', views.video_room, name='video_room'),
    path('end/<str:room_id>/', views.end_call, name='end_call'),
    path('decline/<str:room_id>/', views.decline_call, name='decline_call'),
    path('rate/<str:room_id>/', views.submit_call_rating, name='submit_call_rating'),
    
    # REST API Group Classes
    path('class/create/', views.create_class, name='create_class'),
    path('class/<str:room_id>/join/', views.join_class, name='join_class'),
    path('class/<str:room_id>/admit/', views.admit_participant, name='admit_participant'),
    path('execute_code/', views.execute_code, name='execute_code'),
]
