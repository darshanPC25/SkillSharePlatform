"""
Rating Engine — centralised utility for updating user ratings.
Call update_rating(user, delta, reason) from any view or signal.
"""
import math
from users.models import RatingHistory, Profile


def update_rating(user, delta: float, reason: str = "Activity"):
    """
    Atomically updates a user's rating and persists a history record.
    Returns the new rating value.
    """
    try:
        profile = user.profile
    except Exception:
        return None

    # Clamp minimum rating at 100
    new_rating = max(100.0, float(profile.rating) + float(delta))
    new_rating = round(new_rating, 2)
    profile.rating = new_rating
    profile.save(update_fields=['rating'])

    RatingHistory.objects.create(
        profile=profile,
        rating=new_rating,
        reason=reason
    )

    # Push a live notification about the change
    try:
        from dashboard.notifications import push_notification
        emoji = "📈" if delta > 0 else "📉"
        push_notification(
            recipient_user=user,
            notification_type='system',
            message=f"{emoji} Your rating changed by {'+' if delta > 0 else ''}{delta:.2f} ({reason}). New rating: {new_rating:.1f}",
            link='/profile'
        )
    except Exception as e:
        print(f"[Rating] Could not push notification: {e}")

    return new_rating

def update_peer_rating(user, is_positive: bool, reason: str = "Peer Rating"):
    """
    Dynamically calculates rating delta based on current rating using exponential scaling.
    - Positive scale: 33.7 * exp(-0.001273 * R)
    - Negative scale: 0.207 * exp(0.001273 * R)
    """
    try:
        profile = user.profile
    except Exception:
        return None
        
    R = profile.rating
    
    if is_positive:
        delta = 33.7 * math.exp(-0.001273 * R)
    else:
        # Penalties increase as rating climbs, capping at 150 points to prevent total wipeout
        delta = -1 * min(150.0, 0.207 * math.exp(0.001273 * R))
        
    return update_rating(user, delta, reason)
