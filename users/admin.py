from django.contrib import admin
from .models import Profile, Skill

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'created_at']
    search_fields = ['user__username', 'location']

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'skill_type', 'level', 'can_teach', 'want_to_learn']
    list_filter = ['skill_type', 'level', 'can_teach', 'want_to_learn']
    search_fields = ['name', 'user__username']
