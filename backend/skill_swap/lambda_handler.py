import os
import json
import boto3
from mangum import Mangum
from django.core.asgi import get_asgi_application

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skill_swap.settings')

# Initialize the ASGI application for Mangum
django_asgi_app = get_asgi_application()
handler = Mangum(django_asgi_app, lifespan="off")

# Import the WebSocket bridge logic
from .aws_websocket_bridge import register_connection, unregister_connection, broadcast_to_room

def lambda_handler(event, context):
    """
    Main Lambda entry point. Handles both HTTP (via Mangum)
    and custom WebSocket events for API Gateway.
    """
    # Detect if it's a WebSocket event
    request_context = event.get('requestContext', {})
    if 'connectionId' in request_context:
        return handle_websocket(event, context)
    
    # Otherwise, treat as standard HTTP/REST request
    return handler(event, context)

def handle_websocket(event, context):
    """
    Handles API Gateway WebSocket lifecycle events.
    """
    route_key = event['requestContext']['routeKey']
    connection_id = event['requestContext']['connectionId']
    
    if route_key == '$connect':
        # Retrieve userId and roomId from query string
        query_params = event.get('queryStringParameters', {})
        user_id = query_params.get('user_id', 'anonymous')
        room_id = query_params.get('room_id', 'general') # Default to general if not provided
        
        success = register_connection(connection_id, user_id, room_id)
        if success:
            return {'statusCode': 200, 'body': 'Connected'}
        else:
            return {'statusCode': 500, 'body': 'Failed to connect'}

    elif route_key == '$disconnect':
        unregister_connection(connection_id)
        return {'statusCode': 200, 'body': 'Disconnected'}

    elif route_key == '$default':
        # Incoming message handling
        try:
            body = json.loads(event.get('body', '{}'))
            room_id = body.get('room_id')
            
            # If room_id isn't in message, you might need to query DynamoDB for this connection's room
            # but usually, clients send the room_id in the message body for API Gateway routes.
            if room_id:
                broadcast_to_room(room_id, body, exclude_connection=connection_id)
                
            return {'statusCode': 200, 'body': 'Message Broadcasted'}
        except Exception as e:
            print(f"Error in default route: {e}")
            return {'statusCode': 200, 'body': 'Processed'}

    return {'statusCode': 400, 'body': 'Unsupported route'}
