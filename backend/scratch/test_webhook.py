import requests

url = "https://convergence-approaches-underwear-discovery.trycloudflare.com/webhook/187dc564-5f48-4c5c-a6f4-80d509d1ce86"
payload = {
    "project_name": "Test Project",
    "brief_content": "This is a test brief content to check the webhook response."
}

try:
    print(f"Calling webhook: {url}")
    response = requests.post(url, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {response.headers}")
    print(f"Body: '{response.text}'")
    try:
        print(f"JSON: {response.json()}")
    except Exception as je:
        print(f"JSON Decode Error: {je}")
except Exception as e:
    print(f"Request Error: {e}")
