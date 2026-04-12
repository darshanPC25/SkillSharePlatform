from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Skill, RatingHistory

class RatingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RatingHistory
        fields = ['rating', 'reason', 'date']

class PublicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['bio', 'location', 'profile_picture', 'rating']

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['bio', 'location', 'phone', 'profile_picture', 'is_public', 'rating']
        read_only_fields = ['rating']

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    profile_picture = serializers.ImageField(required=False, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'profile_picture']

    def create(self, validated_data):
        profile_picture = validated_data.pop('profile_picture', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        if profile_picture:
            user.profile.profile_picture = profile_picture
            user.profile.save()
        return user

class SkillSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    proficiency = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = ['id', 'name', 'description', 'can_teach', 'want_to_learn', 'username', 'proficiency']
        read_only_fields = ['user']

    def get_proficiency(self, obj):
        if obj.can_teach:
            return 'CAN TEACH'
        if obj.want_to_learn:
            return 'WANTS TO LEARN'
        return 'GENERAL'
