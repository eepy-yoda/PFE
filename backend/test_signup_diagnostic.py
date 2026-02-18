import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1/auth"

def test_signup_failure():
    # Attempt signup with "manager" role (invalid) and "username" (extra)
    payload = {
        "email": "test@example.com",
        "username": "testuser_123",
        "password": "password123",
        "full_name": "Test User",
        "agency_name": "Test Agency",
        "role": "manager"
    }
    
    print("Testing signup with 'manager' role...")
    try:
        response = requests.post(f"{BASE_URL}/signup", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

def test_signup_success():
    # Attempt signup with valid data
    payload = {
        "email": f"success_{int(time.time())}@example.com",
        "password": "password123",
        "full_name": "Success User",
        "agency_name": "Success Agency",
        "role": "client"
    }
    
    print("\nTesting signup with valid data...")
    try:
        response = requests.post(f"{BASE_URL}/signup", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return payload
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_login(payload):
    if not payload:
        return
    
    login_payload = {
        "email": payload["email"],
        "password": payload["password"]
    }
    
    print("\nTesting login with valid credentials...")
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_signup_failure()
    payload = test_signup_success()
    test_login(payload)
