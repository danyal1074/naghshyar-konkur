import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('89.46.217.44', port=22, username='root', password='c6khenbR98FpxqnM', timeout=10)

nginx_conf = """server {
    listen 80;
    server_name honar.digiral.ir hanar.digiral.ir;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
"""

def run(cmd):
    print(f">>> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out: print(out.strip())
    if err: print('ERR:', err.strip())
    status = stdout.channel.recv_exit_status()
    print(f"Status: {status}\n")
    return status == 0

# Write config using sftp
sftp = ssh.open_sftp()
with sftp.file('/etc/nginx/sites-available/honar.digiral.ir', 'w') as f:
    f.write(nginx_conf)
sftp.close()

run("ln -sf /etc/nginx/sites-available/honar.digiral.ir /etc/nginx/sites-enabled/")
run("nginx -t")
run("systemctl reload nginx")

# Verify radar is still intact
run("systemctl status nginx --no-pager | head -n 10")
run("curl -I -s http://127.0.0.1:3000 | head -n 5")

ssh.close()
