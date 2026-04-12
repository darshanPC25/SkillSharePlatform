import os
import sys
import django

# Add the project root to sys.path
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skill_swap.settings')
django.setup()

from django.contrib.auth.models import User

def create_test_user(username, password, email):
    if User.objects.filter(username=username).exists():
        print(f"User {username} already exists.")
        return False
    
    user = User.objects.create_user(username=username, password=password, email=email)
    user.first_name = "Test"
    user.last_name = "User"
    user.save()
    print(f"Successfully created user: {username}")
    return True

if __name__ == '__main__':
    username = "testuser_v2"
    password = "TestPassword@123"
    email = "testv2@example.com"
    
    if create_test_user(username, password, email):
        # Save credentials to file
        cred_path = os.path.join(os.getcwd(), 'test_credentials.txt')
        with open(cred_path, 'a') as f:
            f.write(f"Username: {username}\nPassword: {password}\nEmail: {email}\n---\n")
        print(f"Credentials saved to {cred_path}")
