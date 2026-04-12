import urllib.request
import urllib.parse
import json

data = json.dumps({'username': 'testuser_v2', 'password': 'TestPassword@123'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/api/token/', data=data, headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    tokens = json.loads(resp.read())
    access = tokens['access']
    req2 = urllib.request.Request('http://127.0.0.1:8000/api/dashboard/home/', headers={'Authorization': f'Bearer {access}'})
    resp2 = urllib.request.urlopen(req2)
    print("Success:")
    print(resp2.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
