"""
AI SupportPro — Development Orchestrator (Backend Directory Wrapper)
Redirects to the root orchestrator to start both FastAPI backend and Vite frontend.
"""
import os
import sys

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_script = os.path.join(root_dir, "run_dev.py")
    if os.path.exists(root_script):
        # Execute root run_dev.py
        import subprocess
        proc = subprocess.run([sys.executable, root_script])
        sys.exit(proc.returncode)
    else:
        print(f"Error: Could not find {root_script}")
        sys.exit(1)

if __name__ == "__main__":
    main()
