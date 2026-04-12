from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.shortcuts import get_object_or_404
from users.models import Skill
from .models import (
    SkillMatch, Assignment, AssignmentQuestion, 
    AssignmentSubmission, SubmissionAnswer, 
    Exam, ExamQuestion, ExamAttempt, ExamAnswer
)
from .serializers import (
    SkillMatchSerializer, AssignmentSerializer, ExamSerializer,
    AssignmentSubmissionSerializer, ExamAttemptSerializer
)
from users.serializers import SkillSerializer
from django.utils import timezone
from .notifications import push_notification
from .rating import update_rating

class DashboardHomeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        my_skills = Skill.objects.filter(user=request.user)
        teach_skills = my_skills.filter(can_teach=True)
        learn_skills = my_skills.filter(want_to_learn=True)
        
        potential_matches = Skill.objects.filter(
            Q(can_teach=True, name__in=learn_skills.values_list('name', flat=True)) |
            Q(want_to_learn=True, name__in=teach_skills.values_list('name', flat=True))
        ).exclude(user=request.user).select_related('user')[:10]

        # All active assignments (show all, my_submission field indicates user status)
        assignments = Assignment.objects.filter(is_active=True).order_by('-created_at')[:10]

        # Active Exams
        exams = Exam.objects.filter(is_active=True).order_by('-scheduled_date')[:5]
        
        return Response({
            'my_skills': SkillSerializer(my_skills, many=True).data,
            'potential_matches': SkillSerializer(potential_matches, many=True).data,
            'assignments': AssignmentSerializer(assignments, many=True, context={'request': request}).data,
            'exams': ExamSerializer(exams, many=True, context={'request': request}).data,
        })

class BrowseSkillsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search = request.query_params.get('search', '')
        can_teach = request.query_params.get('can_teach', '')
        
        skills = Skill.objects.exclude(user=request.user).select_related('user')
        if search:
            skills = skills.filter(Q(name__icontains=search) | Q(description__icontains=search))
        if can_teach == 'true':
            skills = skills.filter(can_teach=True)
        elif can_teach == 'false':
            skills = skills.filter(want_to_learn=True)
            
        return Response(SkillSerializer(skills, many=True).data)

class MatchRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, skill_id):
        skill = get_object_or_404(Skill, id=skill_id)
        if skill.user == request.user:
            return Response({'error': 'Cannot send match request to yourself!'}, status=400)
            
        existing = SkillMatch.objects.filter(
            Q(user=request.user, matched_user=skill.user, skill=skill) |
            Q(user=skill.user, matched_user=request.user, skill=skill)
        ).first()
        
        if existing:
            return Response({'error': 'Match request already exists!'}, status=400)
            
        match = SkillMatch.objects.create(user=request.user, matched_user=skill.user, skill=skill, status='pending')
        # Notify the skill owner about the new match request
        push_notification(
            recipient_user=skill.user,
            notification_type='match',
            message=f"{request.user.username} sent you a skill match request for \"{skill.name}\".",
            link='/matches'
        )
        return Response(SkillMatchSerializer(match).data)

class MyMatchesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sent = SkillMatch.objects.filter(user=request.user).exclude(status='rejected')
        received = SkillMatch.objects.filter(matched_user=request.user).exclude(status='rejected')
        
        return Response({
            'sent_matches': SkillMatchSerializer(sent, many=True).data,
            'received_matches': SkillMatchSerializer(received, many=True).data,
        })

class AcceptMatchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id):
        match = get_object_or_404(SkillMatch, id=match_id, matched_user=request.user)
        match.status = 'accepted'
        match.save()
        # Notify the person who sent the match
        push_notification(
            recipient_user=match.user,
            notification_type='match',
            message=f"{request.user.username} accepted your skill match request for \"{match.skill.name}\"! 🎉",
            link='/matches'
        )
        
        # Award rating points to BOTH users for accepting a match
        update_rating(match.user, 10, "Skill Match Accepted")
        update_rating(request.user, 10, "Skill Match Accepted")
        
        return Response(SkillMatchSerializer(match).data)

class RejectMatchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id):
        match = get_object_or_404(SkillMatch, id=match_id, matched_user=request.user)
        match.status = 'rejected'
        match.save()
        return Response(SkillMatchSerializer(match).data)

class RequestMatchContactView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id):
        from django.db.models import Q
        match = get_object_or_404(SkillMatch, Q(user=request.user) | Q(matched_user=request.user), id=match_id)
        
        contact_type = request.data.get('type') # 'chat' or 'meet'
        recipient = match.user if match.matched_user == request.user else match.matched_user
        
        if contact_type == 'chat':
            notif_type = 'chat'
            message = f"{request.user.username} wants to start a chat with you regarding {match.skill.name}!"
            link = '/chat'
        else:
            notif_type = 'video'
            message = f"📹 {request.user.username} is requesting a live meet for {match.skill.name}. Accept to create the room!"
            # Special link format the frontend can detect to show Accept button
            link = f"__meet_request__:{match.id}"

        push_notification(
            recipient_user=recipient,
            notification_type=notif_type,
            message=message,
            link=link
        )
        return Response({"status": "notification_sent"})

class AcceptMeetView(APIView):
    """
    User B calls this to accept a meet request from User A.
    - Creates a live ClassRoom
    - Notifies User A with the room link so they can join
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id):
        import uuid
        from video.models import ClassRoom
        from django.db.models import Q

        match = get_object_or_404(
            SkillMatch,
            Q(user=request.user) | Q(matched_user=request.user),
            id=match_id
        )

        # User A is whoever is on the other side
        user_a = match.user if match.matched_user == request.user else match.matched_user
        user_b = request.user  # the one accepting

        # Create a fresh classroom
        room_id = str(uuid.uuid4())
        classroom = ClassRoom.objects.create(
            room_id=room_id,
            host=user_b,
            title=f"Meet: {user_b.username} & {user_a.username} — {match.skill.name}",
            is_active=True,
        )
        classroom.participants.add(user_b)
        classroom.participants.add(user_a)

        room_path = f"/class/{room_id}"

        # Notify User A that the meet was accepted + room is ready
        push_notification(
            recipient_user=user_a,
            notification_type='video',
            message=f"🟢 {user_b.username} accepted your meet request for {match.skill.name}! Tap to join.",
            link=room_path
        )

        return Response({
            "status": "meet_accepted",
            "room_id": room_id,
            "room_path": room_path
        })


class AssignmentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        assignments = Assignment.objects.filter(is_active=True).order_by('-created_at')
        return Response(AssignmentSerializer(assignments, many=True, context={'request': request}).data)


class ExamListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        exams = Exam.objects.filter(is_active=True).order_by('-scheduled_date')
        return Response(ExamSerializer(exams, many=True, context={'request': request}).data)

class AssignmentDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    lookup_field = 'id'

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class AssignmentSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        assignment = get_object_or_404(Assignment, id=id)
        
        # Check if already submitted
        if AssignmentSubmission.objects.filter(assignment=assignment, student=request.user).exists():
            return Response({'error': 'Assignment already submitted.'}, status=400)
            
        submission = AssignmentSubmission.objects.create(
            assignment=assignment,
            student=request.user,
            status='submitted'
        )
        
        answers_data = request.data.get('answers', [])
        total_points = 0
        score = 0
        
        for ans in answers_data:
            question_id = ans.get('question_id')
            answer_text = ans.get('answer_text')
            question = get_object_or_404(AssignmentQuestion, id=question_id, assignment=assignment)
            
            is_correct = False
            points_earned = 0
            
            # Simple auto-grading for multiple choice
            if question.question_type in ['multiple_choice', 'true_false']:
                if answer_text == question.correct_answer:
                    is_correct = True
                    points_earned = question.points
                    score += points_earned
            
            SubmissionAnswer.objects.create(
                submission=submission,
                question=question,
                answer_text=answer_text,
                is_correct=is_correct,
                points_earned=points_earned
            )
            total_points += question.points
            
        submission.total_points = total_points
        submission.score = score
        # If all questions are MCQ, we can mark it as graded
        if all(q.question_type != 'text' for q in assignment.questions.all()):
            submission.status = 'graded'
        submission.save()
        
        # Calculate rating changes
        is_passing = False
        if submission.total_points > 0:
             is_passing = (submission.score / submission.total_points) >= 0.7
             
        if is_passing:
             update_rating(request.user, 15, f"Passed Assignment: {assignment.title}")
        else:
             update_rating(request.user, 5, f"Completed Assignment: {assignment.title}")

        # Push notification to the creator of the assignment
        if assignment.creator != request.user:
            push_notification(
                 recipient_user=assignment.creator,
                 notification_type='assignment',
                 message=f"{request.user.username} submitted {assignment.title} (Score: {submission.score}/{submission.total_points})",
                 link='/assignments'
            )
        
        return Response(AssignmentSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)

class LeaderboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from users.models import Profile
        
        # Get top 100 users by rating
        top_profiles = Profile.objects.filter(is_public=True).select_related('user').order_by('-rating')[:100]
        
        leaderboard_data = []
        for index, profile in enumerate(top_profiles):
            userData = {
                'rank': index + 1,
                'username': profile.user.username,
                'first_name': profile.user.first_name,
                'last_name': profile.user.last_name,
                'rating': profile.rating,
                'profile_picture': profile.profile_picture.url if hasattr(profile, 'profile_picture') and profile.profile_picture else None,
            }
            leaderboard_data.append(userData)
            
        return Response(leaderboard_data)

class ExamDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    lookup_field = 'id'

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class ExamAttemptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        exam = get_object_or_404(Exam, id=id)
        
        # Start or Finish attempt?
        action = request.data.get('action', 'start')
        
        if action == 'start':
            existing = ExamAttempt.objects.filter(exam=exam, student=request.user).first()
            if existing:
                if existing.status == 'graded':
                    return Response({'error': 'Exam already completed and graded.'}, status=400)
                # Attempt in progress — return existing
                return Response(ExamAttemptSerializer(existing).data)
                
            attempt = ExamAttempt.objects.create(
                exam=exam,
                student=request.user,
                status='in_progress'
            )
            return Response(ExamAttemptSerializer(attempt).data)
            
        elif action == 'submit':
            attempt = get_object_or_404(ExamAttempt, exam=exam, student=request.user, status='in_progress')
            
            answers_data = request.data.get('answers', [])
            total_score = 0
            
            for ans in answers_data:
                question_id = ans.get('question_id')
                answer_text = ans.get('answer_text')
                question = get_object_or_404(ExamQuestion, id=question_id, exam=exam)
                
                is_correct = False
                points_awarded = 0
                if question.question_type == 'multiple_choice':
                    if answer_text == question.correct_answer:
                        is_correct = True
                        points_awarded = question.points
                        total_score += points_awarded
                
                ExamAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    answer_text=answer_text,
                    is_correct=is_correct,
                    points_awarded=points_awarded
                )
            
            attempt.score = total_score
            attempt.total_points = exam.total_points
            attempt.percentage = (total_score / exam.total_points * 100) if exam.total_points > 0 else 0
            attempt.passed = attempt.score >= exam.passing_score
            attempt.status = 'graded'
            attempt.completed_at = timezone.now()
            attempt.save()
            
            # Apply rating updates for exams
            if attempt.passed:
                update_rating(request.user, 25, f"Passed Exam: {exam.title}")
            else:
                update_rating(request.user, 5, f"Completed Exam: {exam.title}")
                
            # Notify the student of their result
            push_notification(
                recipient_user=request.user,
                notification_type='assignment',  # Reuse assignment icon
                message=f"Exam Graded: {exam.title}. Score: {attempt.percentage:.1f}%. You {'PASSED 🎉' if attempt.passed else 'did not pass.'}",
                link='/exams'
            )
            
            return Response(ExamAttemptSerializer(attempt).data)
        
        return Response({'error': 'Invalid action'}, status=400)

class DashboardAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # 1. Total Sessions (from VideoCall models)
        from video.models import VideoCall
        total_sessions = VideoCall.objects.filter(Q(caller=user) | Q(receiver=user)).count()
        
        # 2. Assignments Completed
        assignments_completed = AssignmentSubmission.objects.filter(student=user).count()
        
        # 3. Exams Passed
        exams_passed = ExamAttempt.objects.filter(student=user, passed=True).count()
        
        # 4. Matches Count
        matches_count = SkillMatch.objects.filter(
            Q(user=user) | Q(matched_user=user), status='accepted'
        ).count()
        
        # 5. Rating History (last 10)
        has_profile = hasattr(user, 'profile')
        profile = user.profile if has_profile else None
        rating = profile.rating if has_profile else 1500
        history_qs = profile.rating_history.all().order_by('-date')[:10] if has_profile else []
        # Reverse to chronological order for charts
        rating_history = [
            {'date': h.date.isoformat(), 'rating': h.rating, 'reason': h.reason}
            for h in reversed(history_qs)
        ]
        
        return Response({
            'total_sessions': total_sessions,
            'assignments_completed': assignments_completed,
            'exams_passed': exams_passed,
            'matches_count': matches_count,
            'current_rating': rating,
            'rating_history': rating_history
        })

class AssignmentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        assignment = Assignment.objects.create(
            creator=request.user,
            title=data.get('title'),
            description=data.get('description', ''),
            difficulty=data.get('difficulty', 'medium'),
            due_date=data.get('due_date'),
            total_points=0
        )
        
        skill_id = data.get('skill_id')
        if skill_id:
            from users.models import Skill
            skill = get_object_or_404(Skill, id=skill_id)
            assignment.skill = skill
            
        questions = data.get('questions', [])
        total_points = 0
        order = 1
        
        for q in questions:
            points = int(q.get('points', 10))
            AssignmentQuestion.objects.create(
                assignment=assignment,
                question_text=q.get('question_text'),
                question_type=q.get('question_type', 'multiple_choice'),
                points=points,
                order=order,
                option_a=q.get('option_a', ''),
                option_b=q.get('option_b', ''),
                option_c=q.get('option_c', ''),
                option_d=q.get('option_d', ''),
                correct_answer=q.get('correct_answer', '')
            )
            total_points += points
            order += 1
            
        assignment.total_points = total_points
        assignment.save()
        return Response(AssignmentSerializer(assignment, context={'request': request}).data, status=status.HTTP_201_CREATED)

class ExamCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        exam = Exam.objects.create(
            creator=request.user,
            title=data.get('title'),
            description=data.get('description', ''),
            difficulty=data.get('difficulty', 'medium'),
            scheduled_date=data.get('scheduled_date'),
            duration_minutes=int(data.get('duration_minutes', 60)),
            passing_score=int(data.get('passing_score', 60)),
            total_points=0
        )
        
        skill_id = data.get('skill_id')
        if skill_id:
            from users.models import Skill
            skill = get_object_or_404(Skill, id=skill_id)
            exam.skill = skill
            
        questions = data.get('questions', [])
        total_points = 0
        order = 1
        
        for q in questions:
            points = int(q.get('points', 10))
            ExamQuestion.objects.create(
                exam=exam,
                question_text=q.get('question_text'),
                question_type=q.get('question_type', 'multiple_choice'),
                points=points,
                order=order,
                option_a=q.get('option_a', ''),
                option_b=q.get('option_b', ''),
                option_c=q.get('option_c', ''),
                option_d=q.get('option_d', ''),
                correct_answer=q.get('correct_answer', '')
            )
            total_points += points
            order += 1
            
        exam.total_points = total_points
        exam.save()
        return Response(ExamSerializer(exam, context={'request': request}).data, status=status.HTTP_201_CREATED)

