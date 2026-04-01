from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.home, name='home'),
    path('browse/', views.browse_skills, name='browse_skills'),
    path('matches/', views.my_matches, name='my_matches'),
    path('match/send/<int:skill_id>/', views.send_match_request, name='send_match'),
    path('match/accept/<int:match_id>/', views.accept_match, name='accept_match'),
    path('match/reject/<int:match_id>/', views.reject_match, name='reject_match'),
    path('match/cancel/<int:match_id>/', views.cancel_match, name='cancel_match'),
    
    # Assignment URLs
    path('assignments/', views.assignment_list, name='assignment_list'),
    path('assignments/create/', views.create_assignment, name='create_assignment'),
    path('assignments/<int:assignment_id>/edit/', views.edit_assignment, name='edit_assignment'),
    path('assignments/<int:assignment_id>/delete/', views.delete_assignment, name='delete_assignment'),
    path('assignments/<int:assignment_id>/take/', views.take_assignment, name='take_assignment'),
    path('submissions/<int:submission_id>/', views.view_submission, name='view_submission'),
    
    # Exam URLs
    path('exams/', views.exam_list, name='exam_list'),
    path('exams/create/', views.create_exam, name='create_exam'),
    path('exams/<int:exam_id>/edit/', views.edit_exam, name='edit_exam'),
    path('exams/<int:exam_id>/delete/', views.delete_exam, name='delete_exam'),
    path('exams/<int:exam_id>/take/', views.take_exam, name='take_exam'),
    path('exam-results/<int:attempt_id>/', views.view_exam_result, name='view_exam_result'),
]
