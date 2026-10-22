import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('89.46.217.44', port=22, username='root', password='c6khenbR98FpxqnM', timeout=15)

def run(cmd):
    print(f"\n>>> RUNNING: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out: print(out.strip())
    if err: print('ERR:', err.strip())
    print(f"Status: {exit_status}")
    return exit_status == 0

# Run certbot for honar.digiral.ir
run("certbot --nginx -d honar.digiral.ir --non-interactive --agree-tos --register-unsafely-without-email --redirect")

# Check nginx reload
run("nginx -t")
run("systemctl reload nginx")

ssh.close()
