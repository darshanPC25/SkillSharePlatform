from django.contrib import admin
from .models import (SkillMatch, Assignment, AssignmentQuestion, AssignmentSubmission,
                      SubmissionAnswer, Exam, ExamQuestion, ExamAttempt, ExamAnswer)

@admin.register(SkillMatch)
class SkillMatchAdmin(admin.ModelAdmin):
    list_display = ['user', 'matched_user', 'skill', 'status', 'created_at']
    list_filter = ['status', 'created_at']


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'creator', 'difficulty', 'due_date', 'is_active', 'created_at']
    list_filter = ['difficulty', 'is_active', 'created_at']
    search_fields = ['title', 'description']


@admin.register(AssignmentQuestion)
class AssignmentQuestionAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'question_type', 'points', 'order']
    list_filter = ['question_type']


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ['student', 'assignment', 'status', 'score', 'submitted_at']
    list_filter = ['status', 'submitted_at']


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ['title', 'creator', 'difficulty', 'scheduled_date', 'is_active', 'created_at']
    list_filter = ['difficulty', 'is_active', 'scheduled_date']
    search_fields = ['title', 'description']


@admin.register(ExamQuestion)
class ExamQuestionAdmin(admin.ModelAdmin):
    list_display = ['exam', 'question_type', 'points', 'order']
    list_filter = ['question_type']


@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = ['student', 'exam', 'status', 'score', 'passed', 'started_at']
    list_filter = ['status', 'passed', 'started_at']


@admin.register(SubmissionAnswer)
class SubmissionAnswerAdmin(admin.ModelAdmin):
    list_display = ['submission', 'question', 'points_earned', 'is_correct']
    list_filter = ['is_correct']


@admin.register(ExamAnswer)
class ExamAnswerAdmin(admin.ModelAdmin):
    list_display = ['attempt', 'question', 'points_awarded', 'is_correct']
    list_filter = ['is_correct']
