import socket

hosts = [
    "51.21.18.29", # aws-1-eu-north-1.pooler.supabase.com
    "13.60.102.132" # aws-1-eu-north-1.pooler.supabase.com
]
ports = [5432, 6543]

for host in hosts:
    print(f"\n--- Checking {host} ---")
    for port in ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, port))
        if result == 0:
            print(f"Port {port}: OPEN")
        else:
            print(f"Port {port}: CLOSED (error {result})")
        sock.close()
