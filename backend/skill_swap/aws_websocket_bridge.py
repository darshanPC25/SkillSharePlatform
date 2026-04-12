import os
import json
import boto3
from botocore.exceptions import ClientError

# Constants
TABLE_NAME = os.environ.get('WS_CONNECTIONS_TABLE', 'SkillSwapConnections')
API_ENDPOINT = os.environ.get('WS_API_ENDPOINT') # e.g. https://{id}.execute-api.us-east-1.amazonaws.com/prod

# Clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)
apigw = boto3.client('apigatewaymanagementapi', endpoint_url=API_ENDPOINT) if API_ENDPOINT else None

def register_connection(connection_id, user_id, room_id):
    """
    Stores a new connection ID in DynamoDB.
    Indexed by connectionId and room_id.
    """
    try:
        table.put_item(Item={
            'connectionId': connection_id,
            'userId': user_id,
            'roomId': room_id,
            'timestamp': int(os.times()[4] * 1000) # Simple timestamp
        })
        return True
    except ClientError as e:
        print(f"Error registering connection: {e}")
        return False

def unregister_connection(connection_id):
    """
    Removes a connection ID from DynamoDB.
    """
    try:
        table.delete_item(Key={'connectionId': connection_id})
        return True
    except ClientError as e:
        print(f"Error unregistering connection: {e}")
        return False

def get_peers_in_room(room_id):
    """
    Retrieves all connection IDs currently in a specific room.
    Note: Requires a Global Secondary Index on 'roomId' in DynamoDB.
    """
    try:
        response = table.query(
            IndexName='roomId-index',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('roomId').eq(room_id)
        )
        return response.get('Items', [])
    except ClientError as e:
        print(f"Error querying peers: {e}")
        return []

def broadcast_to_room(room_id, message, exclude_connection=None):
    """
    Broadcasts a message to everyone in the room.
    """
    if not apigw:
        print("API Gateway endpoint not configured.")
        return

    peers = get_peers_in_room(room_id)
    payload = json.dumps(message)

    for peer in peers:
        cid = peer['connectionId']
        if cid == exclude_connection:
            continue
            
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except apigw.exceptions.GoneException:
            # Clean up stale connection
            unregister_connection(cid)
        except Exception as e:
            print(f"Error sending to {cid}: {e}")
