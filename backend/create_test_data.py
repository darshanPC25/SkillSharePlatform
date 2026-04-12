import os
import sys
import django
from django.utils import timezone

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skill_swap.settings')
django.setup()

from django.contrib.auth.models import User
from dashboard.models import Assignment, AssignmentQuestion
from users.models import Skill

def create_data():
    user = User.objects.first()
    if not user:
        print("No user found. Please register first.")
        return

    skill, _ = Skill.objects.get_or_create(
        user=user, 
        name='Python', 
        defaults={
            'skill_type': 'technical', 
            'level': 'beginner', 
            'can_teach': True
        }
    )

    assignment, _ = Assignment.objects.get_or_create(
        creator=user, 
        title='Python Basics Prep', 
        defaults={
            'description': 'Complete the following core concepts relay.', 
            'skill': skill, 
            'due_date': timezone.now() + timezone.timedelta(days=7)
        }
    )

    AssignmentQuestion.objects.get_or_create(
        assignment=assignment, 
        question_text='What is the correct way to output "Hello World" in Python?', 
        question_type='multiple_choice', 
        option_a='print("Hello World")', 
        option_b='p("Hello World")', 
        option_c='echo("Hello World")', 
        option_d='printf("Hello World")', 
        correct_answer='print("Hello World")', 
        order=1
    )

    AssignmentQuestion.objects.get_or_create(
        assignment=assignment, 
        question_text='Explain the concept of a list in Python.', 
        question_type='text', 
        order=2
    )
    print(f"Test data created for user: {user.username}")

if __name__ == '__main__':
    create_data()
