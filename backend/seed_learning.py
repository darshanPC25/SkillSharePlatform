import os
import sys
import django
from django.utils import timezone

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skill_swap.settings')
django.setup()

from django.contrib.auth.models import User
from dashboard.models import Assignment, AssignmentQuestion, Exam, ExamQuestion
from users.models import Skill


def seed():
    user = User.objects.first()
    if not user:
        print("No user found.")
        return

    # Ensure skill exists
    skill, _ = Skill.objects.get_or_create(
        user=user, name='Python',
        defaults={'skill_type': 'technical', 'level': 'beginner', 'can_teach': True}
    )

    # Ensure assignment exists
    assignment, created = Assignment.objects.get_or_create(
        title='Python Basics Prep',
        defaults={
            'creator': user, 'description': 'Complete the following core concepts relay.',
            'skill': skill, 'due_date': timezone.now() + timezone.timedelta(days=7)
        }
    )
    if created or not assignment.questions.exists():
        AssignmentQuestion.objects.get_or_create(
            assignment=assignment,
            question_text='What is the correct way to output "Hello World" in Python?',
            defaults={
                'question_type': 'multiple_choice',
                'option_a': 'print("Hello World")', 'option_b': 'p("Hello World")',
                'option_c': 'echo("Hello World")', 'option_d': 'printf("Hello World")',
                'correct_answer': 'print("Hello World")', 'order': 1
            }
        )
        AssignmentQuestion.objects.get_or_create(
            assignment=assignment,
            question_text='Explain the concept of a list in Python.',
            defaults={'question_type': 'text', 'order': 2}
        )
        print(f"  -> Assignment questions seeded.")

    # Create exam if not exists
    exam, created = Exam.objects.get_or_create(
        title='Python Fundamentals Certification',
        defaults={
            'creator': user, 'description': 'Assess your Python knowledge across core topics.',
            'skill': skill,
            'scheduled_date': timezone.now() + timezone.timedelta(days=14),
            'duration_minutes': 30, 'total_points': 20, 'passing_score': 12,
        }
    )
    if created or not exam.questions.exists():
        ExamQuestion.objects.get_or_create(
            exam=exam, question_text='Which keyword is used to define a function in Python?',
            defaults={
                'question_type': 'multiple_choice',
                'option_a': 'def', 'option_b': 'function',
                'option_c': 'fn', 'option_d': 'define',
                'correct_answer': 'def', 'points': 10, 'order': 1
            }
        )
        ExamQuestion.objects.get_or_create(
            exam=exam, question_text='Which data type is immutable in Python?',
            defaults={
                'question_type': 'multiple_choice',
                'option_a': 'list', 'option_b': 'dict',
                'option_c': 'tuple', 'option_d': 'set',
                'correct_answer': 'tuple', 'points': 10, 'order': 2
            }
        )
        print(f"  -> Exam questions seeded.")

    print(f"Seed complete for user: {user.username}")


if __name__ == '__main__':
    seed()
