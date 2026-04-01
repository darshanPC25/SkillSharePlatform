from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'users'

urlpatterns = [
    path('', auth_views.LoginView.as_view(template_name='users/login.html'), name='login'),
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name='profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('add-skill/', views.add_skill, name='add_skill'),
    path('delete-skill/<int:pk>/', views.delete_skill, name='delete_skill'),
]
