import os
from django.db import models
from django.contrib.auth.models import User
from PIL import Image

def profile_pic_path(instance, filename):
    return f'profile_pics/{instance.user.username}.webp'

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    profile_picture = models.ImageField(default='default.jpg', upload_to=profile_pic_path)
    location = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    is_public = models.BooleanField(default=True)
    rating = models.FloatField(default=1500.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} Profile'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.profile_picture and hasattr(self.profile_picture, 'path') and 'default.jpg' not in self.profile_picture.path:
            try:
                img = Image.open(self.profile_picture.path)
                # Convert RGBA to RGB for webp if necessary
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                if img.height > 300 or img.width > 300:
                    output_size = (300, 300)
                    img.thumbnail(output_size)
                img.save(self.profile_picture.path, format='WEBP')
            except Exception as e:
                print(f"Error saving image: {e}")

class RatingHistory(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='rating_history')
    rating = models.FloatField()
    reason = models.CharField(max_length=200, default="System Update")
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f'{self.profile.user.username} - {self.rating} ({self.date.strftime("%Y-%m-%d")})'

class Skill(models.Model):
    SKILL_TYPES = (
        ('technical', 'Technical'),
        ('non_technical', 'Non-Technical'),
    )
    
    SKILL_LEVELS = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    skill_type = models.CharField(max_length=20, choices=SKILL_TYPES)
    level = models.CharField(max_length=20, choices=SKILL_LEVELS)
    description = models.TextField()
    can_teach = models.BooleanField(default=False)
    want_to_learn = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} - {self.user.username}'

    class Meta:
        ordering = ['-created_at']

class UserRating(models.Model):
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    target = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    is_positive = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('reviewer', 'target')

    def __str__(self):
        return f'{self.reviewer.username} -> {self.target.username} (Positive: {self.is_positive})'
