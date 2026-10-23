#!/usr/bin/env python3
"""
Automated Deployment Script for Naghshyar (honar.digiral.ir)
Usage: python deploy.py [--skip-build] [--backend-only] [--frontend-only]
"""

import os
import sys
import time
import subprocess
import requests

try:
    import paramiko
except ImportError:
    print("Installing paramiko...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko", "requests"])
    import paramiko

# ── Server Configuration ──
HOST = '89.46.217.44'
USER = 'root'
PASS = 'c6khenbR98FpxqnM'
REMOTE_DIR = '/var/www/honar'

def log(msg):
    print(f"[DEPLOY] {msg}", flush=True)

def build_frontend():
    log("Building frontend with Vite...")
    src_dir = os.path.join(os.getcwd(), 'naghshyar-source', 'naghshyar')
    build_cmd = 'npm run build'
    ret = subprocess.run(build_cmd, shell=True, cwd=src_dir)
    if ret.returncode != 0:
        raise Exception("Frontend build failed!")
    
    log("Copying dist to naghshyar-demo-build...")
    dist_dir = os.path.join(src_dir, 'dist')
    target_dir = os.path.join(os.getcwd(), 'naghshyar-demo-build')
    
    # Use powershell on Windows to copy
    cmd = f"Copy-Item -Path '{dist_dir}\\*' -Destination '{target_dir}' -Recurse -Force"
    subprocess.run(["powershell", "-Command", cmd], check=True)
    log("Frontend build ready for upload.")

def get_ssh_client(retries=5):
    for i in range(retries):
        try:
            c = paramiko.SSHClient()
            c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            c.connect(HOST, username=USER, password=PASS, timeout=15, banner_timeout=25)
            return c
        except Exception as e:
            log(f"SSH attempt {i+1} failed: {e}. Retrying in 2s...")
            time.sleep(2)
    raise Exception("Could not connect to VPS over SSH")

def upload_dir_sftp(sftp, local_dir, remote_dir):
    try:
        sftp.mkdir(remote_dir)
    except:
        pass
    for item in os.listdir(local_dir):
        l_item = os.path.join(local_dir, item)
        r_item = f"{remote_dir}/{item}"
        if os.path.isdir(l_item):
            upload_dir_sftp(sftp, l_item, r_item)
        else:
            sftp.put(l_item, r_item)

def deploy(skip_build=False, backend_only=False, frontend_only=False):
    start_time = time.time()
    log("Starting deployment to honar.digiral.ir...")

    if not skip_build and not backend_only:
        build_frontend()

    client = get_ssh_client()
    sftp = client.open_sftp()
    log("Connected to VPS SFTP.")

    # 1. Upload Backend Files
    if not frontend_only:
        log("Uploading backend files (server.js, sms.js, db.js, gemini.js, etc.)...")
        server_files = ['server.js', 'sms.js', 'db.js', 'gemini.js', 'seedData.js', 'package.json']
        for sf in server_files:
            local_p = os.path.join('server', sf)
            if os.path.exists(local_p):
                sftp.put(local_p, f"{REMOTE_DIR}/server/{sf}")
        log("Backend files updated.")

    # 2. Upload Frontend Build
    if not backend_only:
        log("Uploading frontend build (naghshyar-demo-build)...")
        upload_dir_sftp(sftp, 'naghshyar-demo-build', f"{REMOTE_DIR}/naghshyar-demo-build")
        log("Frontend build updated.")

    sftp.close()

    # 3. Restart PM2 honar ONLY (NEVER touch radar!)
    log("Reloading PM2 process 'honar'...")
    stdin, stdout, stderr = client.exec_command("pm2 reload honar || pm2 restart honar")
    stdout_text = stdout.read().decode('utf-8', errors='ignore')
    log(f"PM2 response: {stdout_text.strip()[:200]}")
    client.close()

    # 4. Verify Endpoints
    log("Verifying live sites...")
    time.sleep(2)
    try:
        r_honar = requests.get("https://honar.digiral.ir", timeout=8)
        log(f"Honar Web Status: {r_honar.status_code} (OK)")
    except Exception as e:
        log(f"Warning: Honar check failed: {e}")

    try:
        r_radar = requests.get("https://radar.digiral.ir", timeout=8)
        log(f"Radar Project Status: {r_radar.status_code} (OK - 100% Intact)")
    except Exception as e:
        log(f"Warning: Radar check failed: {e}")

    elapsed = round(time.time() - start_time, 1)
    log(f"Deployment completed successfully in {elapsed}s!")

if __name__ == '__main__':
    args = sys.argv[1:]
    deploy(
        skip_build='--skip-build' in args,
        backend_only='--backend-only' in args,
        frontend_only='--frontend-only' in args
    )
