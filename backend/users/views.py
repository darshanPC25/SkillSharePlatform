from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .models import Skill
from .serializers import UserSerializer, UserRegisterSerializer, ProfileSerializer, SkillSerializer, PublicProfileSerializer, RatingHistorySerializer
from dashboard.rating import update_peer_rating

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        profile = user.profile
        
        user_data = request.data.get('user', {})
        profile_data = request.data.get('profile', {})

        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        if 'email' in user_data:
            user.email = user_data['email']
        user.save()

        profile_serializer = ProfileSerializer(profile, data=profile_data, partial=True)
        if profile_serializer.is_valid():
            profile_serializer.save()
            return Response({'status': 'success', 'user': UserSerializer(user).data})
        return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SkillListCreateView(generics.ListCreateAPIView):
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class SkillDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Skill.objects.filter(user=self.request.user)

class PublicProfileView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
            if not user.profile.is_public:
                return Response({'error': 'This profile is private.'}, status=status.HTTP_403_FORBIDDEN)
            
            profile_data = PublicProfileSerializer(user.profile).data
            history = user.profile.rating_history.all()
            history_data = RatingHistorySerializer(history, many=True).data
            skills = user.skills.all()
            skills_data = SkillSerializer(skills, many=True).data
            
            return Response({
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'profile': profile_data,
                'rating_history': history_data,
                'skills': skills_data
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class RateUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        if request.user.username == username:
            return Response({'error': 'You cannot rate yourself.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'Target user not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        from .models import UserRating
        
        # Check if already rated
        if UserRating.objects.filter(reviewer=request.user, target=target_user).exists():
            return Response({'error': 'You have already rated this user.'}, status=status.HTTP_400_BAD_REQUEST)
            
        is_positive = request.data.get('is_positive')
        if is_positive is None:
            return Response({'error': 'is_positive boolean flag required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create rating record
        UserRating.objects.create(
            reviewer=request.user,
            target=target_user,
            is_positive=bool(is_positive)
        )
        
        # Apply exponential mathematical shift
        new_rating = update_peer_rating(
            user=target_user, 
            is_positive=bool(is_positive), 
            reason=f"Peer rated by {request.user.username}"
        )
        
        return Response({'success': True, 'new_rating': new_rating}, status=status.HTTP_200_OK)
