"""
setup_proctoring.py
Automatically creates the proctoring_env venv and installs all required packages.
Run via: python setup_proctoring.py
Or automatically via npm run electron:dev
"""
import os
import sys
import subprocess
import platform

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VENV_DIR   = os.path.join(SCRIPT_DIR, "proctoring_env")
REQ_FILE   = os.path.join(SCRIPT_DIR, "requirements.txt")

def get_venv_python():
    if platform.system() == "Windows":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python")

def get_venv_pip():
    if platform.system() == "Windows":
        return os.path.join(VENV_DIR, "Scripts", "pip.exe")
    return os.path.join(VENV_DIR, "bin", "pip")

def run(cmd, **kwargs):
    print(f"  > {' '.join(cmd)}")
    result = subprocess.run(cmd, **kwargs)
    if result.returncode != 0:
        print(f"  ERROR: command failed with code {result.returncode}")
        sys.exit(result.returncode)

def check_already_installed():
    """Returns True if venv exists and all key packages are importable."""
    py = get_venv_python()
    if not os.path.exists(py):
        return False
    check = subprocess.run(
        [py, "-c", "import cv2, numpy, torch, torchvision, ultralytics; print('ok')"],
        capture_output=True, text=True,
        env={**os.environ, "PYTHONPATH": "", "PYTHONNOUSERSITE": "1"}
    )
    return check.stdout.strip() == "ok"

def main():
    print("[setup] Checking proctoring environment...")

    if check_already_installed():
        print("[setup] Environment already set up. Skipping.")
        return

    # 1. Create venv if it doesn't exist
    if not os.path.exists(get_venv_python()):
        print("[setup] Creating virtual environment...")
        run([sys.executable, "-m", "venv", VENV_DIR])
    else:
        print("[setup] Virtual environment exists, reinstalling packages...")

    pip = get_venv_pip()
    py  = get_venv_python()

    # 2. Upgrade pip first
    print("[setup] Upgrading pip...")
    run([py, "-m", "pip", "install", "--upgrade", "pip", "--quiet"])

    # 3. Install numpy first (pinned to <2 for torch compatibility)
    print("[setup] Installing numpy...")
    run([pip, "install", "numpy==1.26.4", "--quiet"])

    # 4. Install torch (CPU-only, much smaller download)
    print("[setup] Installing torch + torchvision (CPU)...")
    run([pip, "install",
         "torch", "torchvision",
         "--index-url", "https://download.pytorch.org/whl/cpu",
         "--quiet"])

    # 5. Install remaining packages
    print("[setup] Installing remaining packages...")
    run([pip, "install",
         "opencv-python", "ultralytics", "requests", "Pillow", "scipy",
         "--quiet"])

    # 6. Verify
    print("[setup] Verifying installation...")
    check = subprocess.run(
        [py, "-c", "import cv2, numpy, torch, torchvision, ultralytics; print('ok')"],
        capture_output=True, text=True,
        env={**os.environ, "PYTHONPATH": "", "PYTHONNOUSERSITE": "1"}
    )
    if check.stdout.strip() == "ok":
        print("[setup] All packages installed successfully.")
    else:
        print(f"[setup] Verification failed:\n{check.stderr}")
        sys.exit(1)

if __name__ == "__main__":
    main()
