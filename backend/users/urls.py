from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='api-register'),
    path('me/', views.CurrentUserView.as_view(), name='api-current-user'),
    path('profile/update/', views.UserProfileUpdateView.as_view(), name='api-update-profile'),
    path('skills/', views.SkillListCreateView.as_view(), name='api-skills-list-create'),
    path('skills/<int:pk>/', views.SkillDetailView.as_view(), name='api-skills-detail'),
    path('profile/public/<str:username>/', views.PublicProfileView.as_view(), name='api-public-profile'),
    path('profile/public/<str:username>/rate/', views.RateUserView.as_view(), name='api-rate-user'),
]
