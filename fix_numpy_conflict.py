#!/usr/bin/env python3
"""
Fix numpy import conflicts by reinstalling in clean environment
"""
import subprocess
import sys
import os

def run_cmd(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    print("🔧 Fixing numpy import conflicts...")
    
    # Uninstall conflicting packages
    packages_to_remove = ["numpy", "transformers", "torch", "opencv-python"]
    
    for pkg in packages_to_remove:
        print(f"Removing {pkg}...")
        run_cmd(f"pip uninstall -y {pkg}")
    
    # Reinstall with specific versions
    print("Installing compatible versions...")
    
    installs = [
        "pip install numpy==1.24.3",
        "pip install opencv-python==4.8.1.78", 
        "pip install fastapi==0.104.1",
        "pip install uvicorn==0.24.0"
    ]
    
    for cmd in installs:
        print(f"Running: {cmd}")
        success, stdout, stderr = run_cmd(cmd)
        if success:
            print("✅ Success")
        else:
            print(f"⚠️ Warning: {stderr}")
    
    print("\n✨ Numpy conflict fix complete!")
    print("Try running the service again.")

if __name__ == "__main__":
    main()