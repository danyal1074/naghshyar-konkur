import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('89.46.217.44', port=22, username='root', password='c6khenbR98FpxqnM', timeout=15)

def run_cmd(cmd):
    print(f"\n==========================================")
    print(f">>> RUNNING: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out.strip())
    if err:
        print('ERR:', err.strip())
    print(f">>> EXIT STATUS: {exit_status}")
    return exit_status == 0

# 1. Clone repository
run_cmd("mkdir -p /var/www/honar")
run_cmd("if [ -d /var/www/honar/.git ]; then cd /var/www/honar && git pull origin main; else git clone https://github.com/danyal1074/naghshyar-konkur.git /var/www/honar; fi")

# 2. Check files in /var/www/honar
run_cmd("ls -la /var/www/honar")

# 3. npm install in server
run_cmd("cd /var/www/honar/server && npm install")

# 4. Stop old if any and start PM2
run_cmd("pm2 delete honar || true")
run_cmd("cd /var/www/honar/server && pm2 start server.js --name 'honar'")
run_cmd("pm2 save")

# 5. Check PM2 list
run_cmd("pm2 list")

# 6. Test internal endpoint
run_cmd("sleep 2 && curl -I http://127.0.0.1:8000/api/subjects")
run_cmd("curl -s http://127.0.0.1:8000/api/subjects | head -c 300")

ssh.close()
print("\n>>> Backend setup completed successfully! <<<")
