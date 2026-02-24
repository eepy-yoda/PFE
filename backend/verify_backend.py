import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_auth_flow():
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    password = "testpassword123"
    full_name = "Test User"
    agency_name = "Test Agency"

    print(f"--- Testing Signup with {email} ---")
    signup_data = {
        "email": email,
        "password": password,
        "full_name": full_name,
        "agency_name": agency_name,
        "role": "client"
    }
    response = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200

    print("\n--- Testing Login ---")
    login_data = {
        "email": email,
        "password": password
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Status: {response.status_code}")
    token_data = response.json()
    print(f"Response: {token_data}")
    assert response.status_code == 200
    assert "access_token" in token_data

    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- Testing Get Me ---")
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    print(f"Status: {response.status_code}")
    user_data = response.json()
    print(f"Response: {user_data}")
    assert response.status_code == 200
    assert user_data["email"] == email

    print("\n--- Testing Update Me ---")
    update_data = {"full_name": "Updated Name"}
    response = requests.put(f"{BASE_URL}/users/me", json=update_data, headers=headers)
    print(f"Status: {response.status_code}")
    updated_user = response.json()
    print(f"Response: {updated_user}")
    assert response.status_code == 200
    assert updated_user["full_name"] == "Updated Name"

    print("\n--- Verification Successful ---")

if __name__ == "__main__":
    try:
        test_auth_flow()
    except Exception as e:
        print(f"\nVerification Failed: {e}")
