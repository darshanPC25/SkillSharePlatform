from django.db import models
from django.contrib.auth.models import User
from PIL import Image

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    profile_picture = models.ImageField(default='default.jpg', upload_to='profile_pics')
    location = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} Profile'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.profile_picture:
            try:
                img = Image.open(self.profile_picture.path)
                if img.height > 300 or img.width > 300:
                    output_size = (300, 300)
                    img.thumbnail(output_size)
                    img.save(self.profile_picture.path)
            except:
                pass

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
