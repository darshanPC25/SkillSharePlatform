from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('home/', views.DashboardHomeView.as_view(), name='api-home'),
    path('browse/', views.BrowseSkillsView.as_view(), name='api-browse-skills'),
    path('matches/', views.MyMatchesView.as_view(), name='api-my-matches'),
    path('matches/request/<int:skill_id>/', views.MatchRequestView.as_view(), name='api-send-match-request'),
    path('matches/accept/<int:match_id>/', views.AcceptMatchView.as_view(), name='api-accept-match'),
    path('matches/reject/<int:match_id>/', views.RejectMatchView.as_view(), name='api-reject-match'),
    path('matches/<int:match_id>/request_contact/', views.RequestMatchContactView.as_view(), name='api-request-contact'),
    path('matches/<int:match_id>/accept_meet/', views.AcceptMeetView.as_view(), name='api-accept-meet'),
    path('assignments/', views.AssignmentListView.as_view(), name='api-assignment-list'),
    path('assignments/create/', views.AssignmentCreateView.as_view(), name='api-assignment-create'),
    path('assignments/<int:id>/', views.AssignmentDetailView.as_view(), name='api-assignment-detail'),
    path('assignments/<int:id>/submit/', views.AssignmentSubmitView.as_view(), name='api-assignment-submit'),
    path('exams/', views.ExamListView.as_view(), name='api-exam-list'),
    path('exams/create/', views.ExamCreateView.as_view(), name='api-exam-create'),
    path('exams/<int:id>/', views.ExamDetailView.as_view(), name='api-exam-detail'),
    path('exams/<int:id>/attempt/', views.ExamAttemptView.as_view(), name='api-exam-attempt'),
    path('analytics/', views.DashboardAnalyticsView.as_view(), name='api-dashboard-analytics'),
    path('leaderboard/', views.LeaderboardView.as_view(), name='api-leaderboard'),
]
