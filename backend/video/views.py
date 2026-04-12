from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.contrib import messages
from django.conf import settings
from django.urls import reverse
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import uuid
import urllib.request
import json
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import VideoCall, VideoCallRating, ClassRoom

@login_required
def video_call_list(request):
    calls = VideoCall.objects.filter(
        Q(caller=request.user) | Q(receiver=request.user)
    ).order_by('-started_at')[:20]

    rated_call_ids = set(
        VideoCallRating.objects.filter(rater=request.user).values_list('call_id', flat=True)
    )

    return render(
        request,
        'video/call_list.html',
        {
            'calls': calls,
            'rated_call_ids': rated_call_ids,
        },
    )

@login_required
def start_call(request, user_id):
    receiver = get_object_or_404(User, id=user_id)
    if receiver == request.user:
        return redirect('dashboard:home')

    room_id = str(uuid.uuid4())
    call = VideoCall.objects.create(
        caller=request.user,
        receiver=receiver,
        room_id=room_id,
        status='calling'
    )

    # Build the absolute room URL to send to receiver
    room_url = request.build_absolute_uri(
        reverse('video:video_room', kwargs={'room_id': room_id})
    )

    # Notify receiver in real-time via their notification WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'notifications_{receiver.id}',
        {
            'type': 'incoming_call',
            'caller': request.user.username,
            'caller_id': request.user.id,
            'room_id': room_id,
            'room_url': room_url,
        }
    )

    return redirect('video:video_room', room_id=room_id)

@login_required
def video_room(request, room_id):
    call = get_object_or_404(VideoCall, room_id=room_id)

    # Check if user is participant
    if call.caller != request.user and call.receiver != request.user:
        return redirect('dashboard:home')

    # Don't allow joining ended calls
    if call.status == 'ended':
        return redirect('video:call_list')

    # Mark active only when the receiver joins (not just the caller alone)
    if call.status == 'calling' and call.receiver == request.user:
        call.status = 'active'
        call.save()

    context = {
        'call': call,
        'room_id': room_id,
        'current_user': request.user,
        'webrtc_ice_servers': settings.WEBRTC_ICE_SERVERS,
        'webrtc_force_relay': settings.WEBRTC_FORCE_RELAY,
    }
    return render(request, 'video/video_room.html', context)

@login_required
def end_call(request, room_id):
    call = get_object_or_404(VideoCall, room_id=room_id)
    
    # Check if user is participant
    if call.caller != request.user and call.receiver != request.user:
        return JsonResponse({'error': 'Not authorized'}, status=403)
    
    # Only end if not already ended
    if call.status != 'ended':
        call.status = 'ended'
        call.ended_at = timezone.now()
        
        # Calculate duration in seconds
        if call.started_at:
            duration = (call.ended_at - call.started_at).total_seconds()
            call.duration = int(duration)
        
        call.save()
    
    return JsonResponse({'status': 'success'})


@login_required
def decline_call(request, room_id):
    """Receiver declined the call — mark missed and notify caller via WebSocket."""
    call = get_object_or_404(VideoCall, room_id=room_id)

    if call.receiver != request.user:
        return JsonResponse({'error': 'Not authorized'}, status=403)

    if call.status == 'calling':
        call.status = 'missed'
        call.ended_at = timezone.now()
        call.save()

    # Notify caller that receiver declined
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'notifications_{call.caller_id}',
        {
            'type': 'call_declined',
            'receiver': request.user.username,
            'room_id': room_id,
        }
    )

    return JsonResponse({'status': 'declined'})


@login_required
def submit_call_rating(request, room_id):
    if request.method != 'POST':
        return redirect('video:call_list')

    call = get_object_or_404(VideoCall, room_id=room_id)

    # Check if user is participant
    if call.caller != request.user and call.receiver != request.user:
        messages.error(request, 'You are not allowed to rate this call.')
        return redirect('video:call_list')

    if call.status != 'ended':
        messages.error(request, 'You can only rate calls after they are ended.')
        return redirect('video:call_list')

    rated_user = call.receiver if call.caller == request.user else call.caller

    try:
        teaching_rating = int(request.POST.get('teaching_rating', 0))
        learning_rating = int(request.POST.get('learning_rating', 0))
    except (TypeError, ValueError):
        messages.error(request, 'Please choose valid ratings.')
        return redirect('video:call_list')

    if teaching_rating not in [1, 2, 3, 4, 5] or learning_rating not in [1, 2, 3, 4, 5]:
        messages.error(request, 'Ratings must be between 1 and 5.')
        return redirect('video:call_list')

    VideoCallRating.objects.update_or_create(
        call=call,
        rater=request.user,
        defaults={
            'rated_user': rated_user,
            'teaching_rating': teaching_rating,
            'learning_rating': learning_rating,
        },
    )

    messages.success(request, f'You rated {rated_user.username} successfully.')
    return redirect('video:call_list')


# --- REST API FOR GROUP CLASSROOMS (React SPA) ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_class(request):
    """Creates a new group classroom session."""
    title = request.data.get('title', 'Live Class Session')
    room_id = str(uuid.uuid4())
    
    classroom = ClassRoom.objects.create(
        room_id=room_id,
        host=request.user,
        title=title,
        is_active=True
    )
    
    # Auto-join the host
    classroom.participants.add(request.user)
    
    return Response({
        'room_id': classroom.room_id,
        'title': classroom.title,
        'host': classroom.host.username,
        'invite_url': f"/class/{classroom.room_id}"
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_class(request, room_id):
    """
    Validates a classroom join request.
    - Host: rejoins immediately.
    - Previously admitted participant: rejoins immediately.
    - New user: returns 'waiting' status so the frontend shows the Waiting Room.
      The actual admission is handled by the host via WebSocket.
    """
    classroom = get_object_or_404(ClassRoom, room_id=room_id)
    
    if not classroom.is_active:
        return Response({'error': 'This class session has ended.'}, status=400)
    
    if request.user == classroom.host:
        return Response({
            'status': 'host',
            'title': classroom.title,
            'host': classroom.host.username,
            'user': request.user.username
        })

    # Previously admitted participants can rejoin directly
    if request.user in classroom.participants.all():
        return Response({
            'status': 'joined',
            'title': classroom.title,
            'host': classroom.host.username,
            'user': request.user.username
        })

    # Check capacity (host + 10 students max)
    if classroom.participants.count() >= 11:
        return Response({'error': 'Class is full (Maximum 10 students allowed).'}, status=403)

    # New user — place in waiting room, host must admit them via WebSocket
    return Response({
        'status': 'waiting',
        'title': classroom.title,
        'host': classroom.host.username,
        'user': request.user.username
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admit_participant(request, room_id):
    """Called by host to officially admit a user into the ClassRoom participants list."""
    classroom = get_object_or_404(ClassRoom, room_id=room_id)
    if request.user != classroom.host:
        return Response({'error': 'Only the host can admit participants.'}, status=403)
    
    username = request.data.get('username')
    try:
        user_to_admit = User.objects.get(username=username)
        classroom.participants.add(user_to_admit)
        return Response({'status': 'admitted', 'username': username})
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_code(request):
    code = request.data.get('code', '')
    language = request.data.get('language', 'python')
    
    # Define docker commands using bash pipes / STDIN to safely mount code
    if language == 'python':
        cmd = ["docker", "run", "--rm", "--network", "none", "--memory", "128m", "-i", "python:3.9-slim", "python", "-"]
    elif language == 'javascript':
        cmd = ["docker", "run", "--rm", "--network", "none", "--memory", "128m", "-i", "node:18-slim", "node", "-"]
    elif language == 'cpp':
        cmd = ["docker", "run", "--rm", "--network", "none", "--memory", "128m", "-i", "gcc:latest", "bash", "-c", "cat > main.cpp && g++ main.cpp && ./a.out"]
    elif language == 'java':
        cmd = ["docker", "run", "--rm", "--network", "none", "--memory", "128m", "-i", "eclipse-temurin:17", "bash", "-c", "cat > Main.java && java Main.java"]
    else:
        return Response({'output': 'Language not supported'}, status=400)

    import subprocess
    
    try:
        result = subprocess.run(
            cmd,
            input=code,
            capture_output=True,
            text=True,
            timeout=15
        )
        
        output = result.stdout
        if result.stderr:
            output += "\n" if output else ""
            output += result.stderr
            
        if not output.strip() and result.returncode == 0:
            output = "No output produced. (Check for infinite loops or empty logic)"
            
        return Response({'output': output.strip()})
    except subprocess.TimeoutExpired:
        return Response({'output': 'Execution timed out. Code took longer than 15 seconds.'})
    except Exception as e:
        return Response({'output': f'Failed to run Docker. Make sure Docker Desktop is open and accessible. Error: {str(e)}'})
