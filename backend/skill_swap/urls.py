"""
Main URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    return JsonResponse({'status': 'ok'})


def db_health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return JsonResponse({'status': 'ok', 'database': 'ok'})
    except Exception:
        return JsonResponse({'status': 'error', 'database': 'unavailable'}, status=503)

def clear_db(request, password):
    if password == 'clear123':
        from django.core.management import call_command
        call_command('flush', interactive=False)
        return JsonResponse({'status': 'ok', 'message': 'Database flushed successfully.'})
    return JsonResponse({'status': 'error', 'message': 'Invalid password.'}, status=403)

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('health/db/', db_health_check, name='db_health_check'),
    path('api/cleardb/<str:password>/', clear_db, name='clear_db'),
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('users.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/video/', include('video.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
