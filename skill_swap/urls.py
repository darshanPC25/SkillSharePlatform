"""
Main URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
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

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('health/db/', db_health_check, name='db_health_check'),
    path('admin/', admin.site.urls),
    path('', include('users.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('chat/', include('chat.urls')),
    path('video/', include('video.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
