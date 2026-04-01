from django.db import models
from django.contrib.auth.models import User
from users.models import Skill

class SkillMatch(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_sent')
    matched_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_received')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=(
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ), default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} -> {self.matched_user.username} ({self.skill.name})'

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'matched_user', 'skill']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['matched_user', 'status']),
        ]


class Assignment(models.Model):
    DIFFICULTY_CHOICES = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )
    
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments_created')
    title = models.CharField(max_length=200)
    description = models.TextField()
    skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='medium')
    due_date = models.DateTimeField()
    total_points = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f'{self.title} by {self.creator.username}'
    
    class Meta:
        ordering = ['-created_at']


class AssignmentQuestion(models.Model):
    QUESTION_TYPES = (
        ('text', 'Text Answer'),
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
    )
    
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='text')
    points = models.IntegerField(default=10)
    order = models.IntegerField(default=0)
    
    # For multiple choice
    option_a = models.CharField(max_length=200, blank=True)
    option_b = models.CharField(max_length=200, blank=True)
    option_c = models.CharField(max_length=200, blank=True)
    option_d = models.CharField(max_length=200, blank=True)
    correct_answer = models.CharField(max_length=200, blank=True)
    
    def __str__(self):
        return f'{self.assignment.title} - Q{self.order}'
    
    class Meta:
        ordering = ['order']


class AssignmentSubmission(models.Model):
    STATUS_CHOICES = (
        ('submitted', 'Submitted'),
        ('graded', 'Graded'),
        ('late', 'Late Submission'),
    )
    
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignment_submissions')
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    score = models.IntegerField(null=True, blank=True)
    total_points = models.IntegerField(default=0)
    feedback = models.TextField(blank=True)
    
    def __str__(self):
        return f'{self.student.username} - {self.assignment.title}'
    
    class Meta:
        ordering = ['-submitted_at']
        unique_together = ['assignment', 'student']


class SubmissionAnswer(models.Model):
    submission = models.ForeignKey(AssignmentSubmission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(AssignmentQuestion, on_delete=models.CASCADE)
    answer_text = models.TextField()
    points_earned = models.IntegerField(null=True, blank=True)
    is_correct = models.BooleanField(default=False)
    feedback = models.TextField(blank=True)
    
    def __str__(self):
        return f'{self.submission.student.username} - {self.question}'


class Exam(models.Model):
    DIFFICULTY_CHOICES = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )
    
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exams_created')
    title = models.CharField(max_length=200)
    description = models.TextField()
    skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='medium')
    scheduled_date = models.DateTimeField()
    duration_minutes = models.IntegerField(default=60)
    total_points = models.IntegerField(default=100)
    passing_score = models.IntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f'{self.title} by {self.creator.username}'
    
    class Meta:
        ordering = ['-scheduled_date']


class ExamQuestion(models.Model):
    QUESTION_TYPES = (
        ('text', 'Text Answer'),
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
    )
    
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='multiple_choice')
    points = models.IntegerField(default=10)
    order = models.IntegerField(default=0)
    
    # For multiple choice
    option_a = models.CharField(max_length=200, blank=True)
    option_b = models.CharField(max_length=200, blank=True)
    option_c = models.CharField(max_length=200, blank=True)
    option_d = models.CharField(max_length=200, blank=True)
    correct_answer = models.CharField(max_length=200, blank=True)
    
    def __str__(self):
        return f'{self.exam.title} - Q{self.order}'
    
    class Meta:
        ordering = ['order']


class ExamAttempt(models.Model):
    STATUS_CHOICES = (
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('graded', 'Graded'),
    )
    
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    score = models.IntegerField(null=True, blank=True)
    total_points = models.IntegerField(default=0)
    percentage = models.FloatField(default=0)
    passed = models.BooleanField(default=False)
    
    def __str__(self):
        return f'{self.student.username} - {self.exam.title}'
    
    class Meta:
        ordering = ['-started_at']
        unique_together = ['exam', 'student']


class ExamAnswer(models.Model):
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(ExamQuestion, on_delete=models.CASCADE)
    answer_text = models.TextField()
    points_earned = models.IntegerField(default=0)
    points_awarded = models.IntegerField(default=0)
    is_correct = models.BooleanField(default=False)
    
    def __str__(self):
        return f'{self.attempt.student.username} - {self.question}'
