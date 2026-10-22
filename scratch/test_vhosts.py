import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('89.46.217.44', port=22, username='root', password='c6khenbR98FpxqnM', timeout=10)

stdin, stdout, stderr = ssh.exec_command("curl -I -H 'Host: honar.digiral.ir' http://127.0.0.1/")
print('HONAR NGINX TEST:\n', stdout.read().decode('utf-8'))

stdin, stdout, stderr = ssh.exec_command("curl -I -H 'Host: radar.digiral.ir' http://127.0.0.1/")
print('RADAR NGINX TEST:\n', stdout.read().decode('utf-8'))

ssh.close()
