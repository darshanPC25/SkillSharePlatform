from rest_framework import serializers
from .models import (
    SkillMatch, Assignment, AssignmentQuestion, 
    AssignmentSubmission, SubmissionAnswer, 
    Exam, ExamQuestion, ExamAttempt, ExamAnswer
)
from users.serializers import UserSerializer, SkillSerializer

class SkillMatchSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    matched_user = UserSerializer(read_only=True)
    skill = SkillSerializer(read_only=True)

    class Meta:
        model = SkillMatch
        fields = '__all__'

class AssignmentQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignmentQuestion
        fields = '__all__'

class SubmissionAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionAnswer
        fields = '__all__'

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    answers = SubmissionAnswerSerializer(many=True, read_only=True)
    
    class Meta:
        model = AssignmentSubmission
        fields = '__all__'

class AssignmentSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    skill = SkillSerializer(read_only=True)
    questions = AssignmentQuestionSerializer(many=True, read_only=True)
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = '__all__'

    def get_my_submission(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            submission = AssignmentSubmission.objects.filter(assignment=obj, student=request.user).first()
            if submission:
                return AssignmentSubmissionSerializer(submission).data
        return None

class ExamQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamQuestion
        fields = '__all__'

class ExamAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAnswer
        fields = '__all__'

class ExamAttemptSerializer(serializers.ModelSerializer):
    answers = ExamAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = ExamAttempt
        fields = '__all__'

class ExamSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    skill = SkillSerializer(read_only=True)
    questions = ExamQuestionSerializer(many=True, read_only=True)
    my_attempt = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = '__all__'

    def get_my_attempt(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            attempt = ExamAttempt.objects.filter(exam=obj, student=request.user).first()
            if attempt:
                return ExamAttemptSerializer(attempt).data
        return None
