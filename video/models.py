from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

class VideoCall(models.Model):
    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_made')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_received')
    room_id = models.CharField(max_length=255, unique=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0, help_text='Duration in seconds')
    status = models.CharField(max_length=20, choices=(
        ('calling', 'Calling'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('missed', 'Missed'),
    ), default='calling')

    def __str__(self):
        return f'{self.caller.username} -> {self.receiver.username} ({self.status})'

    class Meta:
        ordering = ['-started_at']


class VideoCallRating(models.Model):
    call = models.ForeignKey(VideoCall, on_delete=models.CASCADE, related_name='ratings')
    rater = models.ForeignKey(User, on_delete=models.CASCADE, related_name='given_video_call_ratings')
    rated_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_video_call_ratings')
    teaching_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    learning_rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f'Rating {self.teaching_rating}/{self.learning_rating} '
            f'from {self.rater.username} to {self.rated_user.username}'
        )

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['call', 'rater'], name='unique_video_call_rating_per_rater'),
        ]
