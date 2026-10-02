"""
AI SupportPro — Development Orchestrator
Launches FastAPI backend (port 8000) and Vite frontend (port 3000) concurrently.
"""
import subprocess
import sys
import os
import signal
import time

def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=" * 60)
    print("  AI SupportPro -- Development Services Starting")
    print("=" * 60)
    print(f"  Backend:  http://127.0.0.1:8000 (Docs: /docs)")
    print(f"  Frontend: http://localhost:3000")
    print("=" * 60)

    # 1. Start backend process
    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=backend_dir,
        shell=False
    )

    # 2. Start frontend process
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        shell=(sys.platform == "win32")
    )

    def shutdown(signum=None, frame=None):
        print("\nStopping services...")
        try:
            backend_proc.terminate()
        except Exception:
            pass
        try:
            frontend_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print(f"Backend exited with code {backend_proc.returncode}")
                break
            if frontend_proc.poll() is not None:
                print(f"Frontend exited with code {frontend_proc.returncode}")
                break
    except KeyboardInterrupt:
        shutdown()

if __name__ == "__main__":
    main()
