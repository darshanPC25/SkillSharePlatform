from django.contrib import admin
from .models import VideoCall, VideoCallRating

@admin.register(VideoCall)
class VideoCallAdmin(admin.ModelAdmin):
    list_display = ['caller', 'receiver', 'status', 'started_at', 'duration']
    list_filter = ['status', 'started_at']


@admin.register(VideoCallRating)
class VideoCallRatingAdmin(admin.ModelAdmin):
    list_display = ['call', 'rater', 'rated_user', 'teaching_rating', 'learning_rating', 'created_at']
    list_filter = ['teaching_rating', 'learning_rating', 'created_at']
    search_fields = ['rater__username', 'rated_user__username', 'call__room_id']
