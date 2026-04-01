from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.db.models import Q, Avg, Count
from django.utils import timezone
from users.models import Skill
from video.models import VideoCallRating
from .models import (SkillMatch, Assignment, AssignmentQuestion, AssignmentSubmission,
                      SubmissionAnswer, Exam, ExamQuestion, ExamAttempt, ExamAnswer)

@login_required
def home(request):
    my_skills = Skill.objects.filter(user=request.user)
    
    # Find matching skills
    teach_skills = my_skills.filter(can_teach=True)
    learn_skills = my_skills.filter(want_to_learn=True)
    
    # Get potential matches
    potential_matches = Skill.objects.filter(
        Q(can_teach=True, name__in=learn_skills.values_list('name', flat=True)) |
        Q(want_to_learn=True, name__in=teach_skills.values_list('name', flat=True))
    ).exclude(user=request.user).select_related('user')[:10]
    
    context = {
        'my_skills': my_skills,
        'potential_matches': potential_matches,
    }
    return render(request, 'dashboard/home.html', context)

@login_required
def browse_skills(request):
    skill_type = request.GET.get('type', '')
    search = request.GET.get('search', '')
    
    skills = Skill.objects.exclude(user=request.user).select_related('user')
    
    if skill_type:
        skills = skills.filter(skill_type=skill_type)
    if search:
        skills = skills.filter(Q(name__icontains=search) | Q(description__icontains=search))
    
    # Get all users that the current user is connected with (accepted matches)
    connected_users = set()
    accepted_matches = SkillMatch.objects.filter(
        Q(user=request.user, status='accepted') | 
        Q(matched_user=request.user, status='accepted')
    ).select_related('user', 'matched_user')
    
    for match in accepted_matches:
        if match.user == request.user:
            connected_users.add(match.matched_user.id)
        else:
            connected_users.add(match.user.id)

    user_ids = list(skills.values_list('user_id', flat=True).distinct())
    rating_rows = VideoCallRating.objects.filter(rated_user_id__in=user_ids).values('rated_user_id').annotate(
        avg_teaching=Avg('teaching_rating'),
        avg_learning=Avg('learning_rating'),
        total_ratings=Count('id'),
    )
    user_ratings = {
        row['rated_user_id']: {
            'avg_teaching': round(row['avg_teaching'], 1) if row['avg_teaching'] is not None else None,
            'avg_learning': round(row['avg_learning'], 1) if row['avg_learning'] is not None else None,
            'total_ratings': row['total_ratings'],
        }
        for row in rating_rows
    }

    for skill in skills:
        skill.rating_summary = user_ratings.get(skill.user_id)
    
    context = {
        'skills': skills,
        'skill_type': skill_type,
        'search': search,
        'connected_users': connected_users,
    }
    return render(request, 'dashboard/browse_skills.html', context)

@login_required
def send_match_request(request, skill_id):
    skill = get_object_or_404(Skill, id=skill_id)
    if skill.user == request.user:
        messages.error(request, 'Cannot send match request to yourself!')
        return redirect('dashboard:home')
    
    # Check if match already exists in either direction
    existing = SkillMatch.objects.filter(
        Q(user=request.user, matched_user=skill.user, skill=skill) |
        Q(user=skill.user, matched_user=request.user, skill=skill)
    ).first()
    
    if existing:
        if existing.user == request.user:
            messages.info(request, 'Match request already sent!')
        else:
            # There's already a request from them to you
            messages.info(request, f'{skill.user.username} has already sent you a match request for this skill. Check your received requests!')
    else:
        SkillMatch.objects.create(user=request.user, matched_user=skill.user, skill=skill, status='pending')
        messages.success(request, 'Match request sent!')
    
    return redirect('dashboard:browse_skills')

@login_required
def my_matches(request):
    # Show only pending and accepted matches by default (hide rejected)
    sent = SkillMatch.objects.filter(
        user=request.user
    ).exclude(status='rejected').select_related('matched_user', 'skill', 'matched_user__profile')
    
    received = SkillMatch.objects.filter(
        matched_user=request.user
    ).exclude(status='rejected').select_related('user', 'skill', 'user__profile')
    
    context = {
        'sent_matches': sent,
        'received_matches': received,
    }
    return render(request, 'dashboard/my_matches.html', context)

@login_required
def accept_match(request, match_id):
    match = get_object_or_404(SkillMatch, id=match_id, matched_user=request.user)
    match.status = 'accepted'
    match.save()
    messages.success(request, 'Match accepted! You can now chat.')
    return redirect('dashboard:my_matches')

@login_required
def reject_match(request, match_id):
    match = get_object_or_404(SkillMatch, id=match_id, matched_user=request.user)
    match.status = 'rejected'
    match.save()
    messages.info(request, 'Match rejected.')
    return redirect('dashboard:my_matches')

@login_required
def cancel_match(request, match_id):
    """Allow sender to cancel their own pending match request"""
    match = get_object_or_404(SkillMatch, id=match_id, user=request.user)
    if match.status == 'pending':
        match.delete()
        messages.success(request, 'Match request cancelled.')
    else:
        messages.error(request, 'Cannot cancel a match that has already been responded to.')
    return redirect('dashboard:my_matches')


# Assignment Views
@login_required
def assignment_list(request):
    # Assignments created by user
    my_assignments = Assignment.objects.filter(creator=request.user).prefetch_related('questions')
    
    # Assignments available to take
    available_assignments = Assignment.objects.filter(
        is_active=True,
        due_date__gte=timezone.now()
    ).exclude(creator=request.user).prefetch_related('questions')
    
    # Submissions by user
    my_submissions = AssignmentSubmission.objects.filter(student=request.user).select_related('assignment')
    submitted_ids = my_submissions.values_list('assignment_id', flat=True)
    
    context = {
        'my_assignments': my_assignments,
        'available_assignments': available_assignments,
        'my_submissions': my_submissions,
        'submitted_ids': submitted_ids,
    }
    return render(request, 'dashboard/assignment_list.html', context)


@login_required
def create_assignment(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        skill_id = request.POST.get('skill')
        difficulty = request.POST.get('difficulty')
        due_date = request.POST.get('due_date')
        
        skill = None
        if skill_id:
            skill = Skill.objects.filter(id=skill_id, user=request.user).first()
        
        assignment = Assignment.objects.create(
            creator=request.user,
            title=title,
            description=description,
            skill=skill,
            difficulty=difficulty,
            due_date=due_date
        )
        
        messages.success(request, f'Assignment "{title}" created successfully!')
        return redirect('dashboard:edit_assignment', assignment_id=assignment.id)
    
    my_skills = Skill.objects.filter(user=request.user)
    return render(request, 'dashboard/create_assignment.html', {'my_skills': my_skills})


@login_required
def edit_assignment(request, assignment_id):
    assignment = get_object_or_404(Assignment, id=assignment_id, creator=request.user)
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'add_question':
            question_text = request.POST.get('question_text')
            question_type = request.POST.get('question_type')
            points = request.POST.get('points', 10)
            
            question = AssignmentQuestion.objects.create(
                assignment=assignment,
                question_text=question_text,
                question_type=question_type,
                points=points,
                order=assignment.questions.count() + 1
            )
            
            if question_type == 'multiple_choice':
                question.option_a = request.POST.get('option_a', '')
                question.option_b = request.POST.get('option_b', '')
                question.option_c = request.POST.get('option_c', '')
                question.option_d = request.POST.get('option_d', '')
                question.correct_answer = request.POST.get('correct_answer', '')
                question.save()
            elif question_type == 'true_false':
                question.correct_answer = request.POST.get('correct_answer', '')
                question.save()
            
            messages.success(request, 'Question added successfully!')
        
        return redirect('dashboard:edit_assignment', assignment_id=assignment.id)
    
    questions = assignment.questions.all()
    context = {
        'assignment': assignment,
        'questions': questions,
    }
    return render(request, 'dashboard/edit_assignment.html', context)


@login_required
def take_assignment(request, assignment_id):
    assignment = get_object_or_404(Assignment, id=assignment_id, is_active=True)
    
    # Check if already submitted
    existing = AssignmentSubmission.objects.filter(assignment=assignment, student=request.user).first()
    if existing:
        messages.info(request, 'You have already submitted this assignment.')
        return redirect('dashboard:view_submission', submission_id=existing.id)
    
    if request.method == 'POST':
        # Create submission
        is_late = timezone.now() > assignment.due_date
        submission = AssignmentSubmission.objects.create(
            assignment=assignment,
            student=request.user,
            status='late' if is_late else 'submitted'
        )
        
        # Save answers
        total_auto_score = 0
        for question in assignment.questions.all():
            answer_text = request.POST.get(f'answer_{question.id}', '')
            answer = SubmissionAnswer.objects.create(
                submission=submission,
                question=question,
                answer_text=answer_text,
                points_earned=0  # Initialize to 0 for all questions
            )
            
            # Auto-grade multiple choice and true/false
            if question.question_type in ['multiple_choice', 'true_false']:
                if answer_text.strip().lower() == question.correct_answer.strip().lower():
                    answer.points_earned = question.points
                    total_auto_score += question.points
                    answer.is_correct = True
                else:
                    answer.points_earned = 0
                    answer.is_correct = False
                answer.save()
        
        # Calculate total points
        total_points = sum(q.points for q in assignment.questions.all())
        submission.total_points = total_points
        submission.score = total_auto_score  # Set initial score from auto-graded questions
        
        # Mark as graded if all questions are auto-graded
        if assignment.questions.filter(question_type='text').count() == 0:
            submission.status = 'graded'
        submission.save()
        
        messages.success(request, 'Assignment submitted successfully!')
        return redirect('dashboard:view_submission', submission_id=submission.id)
    
    questions = assignment.questions.all()
    total_points = sum(q.points for q in questions)
    context = {
        'assignment': assignment,
        'questions': questions,
        'total_points': total_points,
    }
    return render(request, 'dashboard/take_assignment.html', context)


@login_required
def view_submission(request, submission_id):
    submission = get_object_or_404(
        AssignmentSubmission,
        id=submission_id,
        student=request.user
    )
    
    # Calculate percentage
    percentage = 0
    if submission.total_points > 0:
        percentage = (submission.score / submission.total_points) * 100
    
    answers = submission.answers.all().select_related('question')
    context = {
        'submission': submission,
        'answers': answers,
        'percentage': percentage,
    }
    return render(request, 'dashboard/view_submission.html', context)


# Exam Views
@login_required
def exam_list(request):
    # Exams created by user
    my_exams = Exam.objects.filter(creator=request.user).prefetch_related('questions')
    
    # Exams available to take
    upcoming_exams = Exam.objects.filter(
        is_active=True,
        scheduled_date__gte=timezone.now()
    ).exclude(creator=request.user).prefetch_related('questions')
    
    # Exam attempts by user
    my_attempts = ExamAttempt.objects.filter(student=request.user).select_related('exam')
    attempted_ids = my_attempts.values_list('exam_id', flat=True)
    
    context = {
        'my_exams': my_exams,
        'upcoming_exams': upcoming_exams,
        'my_attempts': my_attempts,
        'attempted_ids': attempted_ids,
    }
    return render(request, 'dashboard/exam_list.html', context)


@login_required
def create_exam(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        skill_id = request.POST.get('skill')
        difficulty = request.POST.get('difficulty')
        scheduled_date = request.POST.get('scheduled_date')
        duration_minutes = request.POST.get('duration_minutes', 60)
        passing_score = request.POST.get('passing_score', 60)
        
        skill = None
        if skill_id:
            skill = Skill.objects.filter(id=skill_id, user=request.user).first()
        
        exam = Exam.objects.create(
            creator=request.user,
            title=title,
            description=description,
            skill=skill,
            difficulty=difficulty,
            scheduled_date=scheduled_date,
            duration_minutes=duration_minutes,
            passing_score=passing_score
        )
        
        messages.success(request, f'Exam "{title}" created successfully!')
        return redirect('dashboard:edit_exam', exam_id=exam.id)
    
    my_skills = Skill.objects.filter(user=request.user)
    return render(request, 'dashboard/create_exam.html', {'my_skills': my_skills})


@login_required
def edit_exam(request, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, creator=request.user)
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'add_question':
            question_text = request.POST.get('question_text')
            question_type = request.POST.get('question_type')
            points = request.POST.get('points', 10)
            
            question = ExamQuestion.objects.create(
                exam=exam,
                question_text=question_text,
                question_type=question_type,
                points=points,
                order=exam.questions.count() + 1
            )
            
            if question_type == 'multiple_choice':
                question.option_a = request.POST.get('option_a', '')
                question.option_b = request.POST.get('option_b', '')
                question.option_c = request.POST.get('option_c', '')
                question.option_d = request.POST.get('option_d', '')
                question.correct_answer = request.POST.get('correct_answer', '')
                question.save()
            elif question_type == 'true_false':
                question.correct_answer = request.POST.get('correct_answer', '')
                question.save()
            
            messages.success(request, 'Question added successfully!')
        
        return redirect('dashboard:edit_exam', exam_id=exam.id)
    
    questions = exam.questions.all()
    context = {
        'exam': exam,
        'questions': questions,
    }
    return render(request, 'dashboard/edit_exam.html', context)


@login_required
def take_exam(request, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, is_active=True)
    
    # Check if already attempted
    existing = ExamAttempt.objects.filter(exam=exam, student=request.user).first()
    if existing:
        messages.info(request, 'You have already attempted this exam.')
        return redirect('dashboard:view_exam_result', attempt_id=existing.id)
    
    # Check if exam has started
    if timezone.now() < exam.scheduled_date:
        messages.warning(request, 'This exam has not started yet.')
        return redirect('dashboard:exam_list')
    
    if request.method == 'POST':
        # Create attempt
        attempt = ExamAttempt.objects.create(
            exam=exam,
            student=request.user,
            status='completed'
        )
        
        # Save answers and calculate score
        total_score = 0
        total_points = sum(q.points for q in exam.questions.all())
        
        for question in exam.questions.all():
            answer_text = request.POST.get(f'answer_{question.id}', '')
            answer = ExamAnswer.objects.create(
                attempt=attempt,
                question=question,
                answer_text=answer_text
            )
            
            # Auto-grade multiple choice and true/false
            if question.question_type in ['multiple_choice', 'true_false']:
                if answer_text.strip().lower() == question.correct_answer.strip().lower():
                    answer.points_awarded = question.points
                    total_score += question.points
                    answer.is_correct = True
                else:
                    answer.points_awarded = 0
                    answer.is_correct = False
                answer.save()
        
        # Update attempt score
        attempt.score = total_score
        attempt.total_points = total_points
        attempt.percentage = (total_score / total_points * 100) if total_points > 0 else 0
        attempt.passed = attempt.percentage >= exam.passing_score
        attempt.status = 'graded'
        attempt.save()
        
        messages.success(request, 'Exam submitted successfully!')
        return redirect('dashboard:view_exam_result', attempt_id=attempt.id)
    
    questions = exam.questions.all()
    total_points = sum(q.points for q in questions)
    context = {
        'exam': exam,
        'questions': questions,
        'total_points': total_points,
    }
    return render(request, 'dashboard/take_exam.html', context)


@login_required
def view_exam_result(request, attempt_id):
    attempt = get_object_or_404(
        ExamAttempt,
        id=attempt_id,
        student=request.user
    )
    
    answers = attempt.answers.all().select_related('question')
    context = {
        'attempt': attempt,
        'answers': answers,
    }
    return render(request, 'dashboard/view_exam_result.html', context)


# Delete Views
@login_required
def delete_assignment(request, assignment_id):
    assignment = get_object_or_404(Assignment, id=assignment_id, creator=request.user)
    
    if request.method == 'POST':
        assignment.delete()
        messages.success(request, f'Assignment "{assignment.title}" deleted successfully!')
        return redirect('dashboard:assignment_list')
    
    return redirect('dashboard:edit_assignment', assignment_id=assignment_id)


@login_required
def delete_exam(request, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, creator=request.user)
    
    if request.method == 'POST':
        exam.delete()
        messages.success(request, f'Exam "{exam.title}" deleted successfully!')
        return redirect('dashboard:exam_list')
    
    return redirect('dashboard:edit_exam', exam_id=exam_id)
