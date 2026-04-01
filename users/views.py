from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from .forms import UserRegisterForm, UserUpdateForm, ProfileUpdateForm, SkillForm
from .models import Skill

def register(request):
    if request.method == 'POST':
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username}!')
            login(request, user)
            return redirect('dashboard:home')
    else:
        form = UserRegisterForm()
    return render(request, 'users/register.html', {'form': form})

@login_required
def profile(request):
    teaching_skills = request.user.skills.filter(can_teach=True)
    learning_interests = request.user.skills.filter(want_to_learn=True)
    
    context = {
        'profile_user': request.user,
        'teaching_skills': teaching_skills,
        'learning_interests': learning_interests,
    }
    return render(request, 'users/profile.html', context)

@login_required
def edit_profile(request):
    if request.method == 'POST':
        u_form = UserUpdateForm(request.POST, instance=request.user)
        p_form = ProfileUpdateForm(request.POST, request.FILES, instance=request.user.profile)
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
            messages.success(request, 'Your profile has been updated!')
            return redirect('users:profile')
    else:
        u_form = UserUpdateForm(instance=request.user)
        p_form = ProfileUpdateForm(instance=request.user.profile)
    
    context = {
        'u_form': u_form,
        'p_form': p_form,
    }
    return render(request, 'users/edit_profile.html', context)

@login_required
def add_skill(request):
    if request.method == 'POST':
        form = SkillForm(request.POST)
        if form.is_valid():
            skill = form.save(commit=False)
            skill.user = request.user
            skill.save()
            messages.success(request, 'Skill added successfully!')
            return redirect('users:profile')
    else:
        form = SkillForm()
    return render(request, 'users/add_skill.html', {'form': form})

@login_required
def delete_skill(request, pk):
    skill = Skill.objects.get(pk=pk, user=request.user)
    if request.method == 'POST':
        skill.delete()
        messages.success(request, 'Skill deleted successfully!')
        return redirect('users:profile')
    return render(request, 'users/delete_skill.html', {'skill': skill})
