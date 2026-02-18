import socket

host = "52.59.152.35" # aws-0-eu-central-1.pooler.supabase.com
port = 5432

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(10)
print(f"Checking Port {port} on {host}...")
try:
    result = sock.connect_ex((host, port))
    if result == 0:
        print("RESULT: OPEN")
    else:
        print(f"RESULT: CLOSED (code {result})")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    sock.close()
