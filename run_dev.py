"""
AI SupportPro — Development Orchestrator & Auto Launcher
Checks if FastAPI backend (port 8000) and Vite frontend (port 3000) are active.
Launches any missing services concurrently and automatically opens http://localhost:3000 in your browser.
"""
import subprocess
import sys
import os
import signal
import time
import socket
import webbrowser
import threading


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a network port is already open and listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.6)
        return s.connect_ex((host, port)) == 0


def open_browser_when_ready(url: str = "http://localhost:3000", max_wait: int = 15):
    """Wait for the web service to be responsive, then open default browser."""
    start = time.time()
    while time.time() - start < max_wait:
        if is_port_in_use(3000):
            time.sleep(1.2)  # Give Vite a moment to initialize the bundle
            try:
                print(f"\n[Browser] Opening {url}...")
                webbrowser.open(url)
            except Exception as e:
                print(f"[Browser] Notice: Could not auto-launch browser ({e}). Please visit {url}")
            return
        time.sleep(0.5)

    try:
        webbrowser.open(url)
    except Exception:
        pass


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
    print("  AI SupportPro -- One-Click Development Launcher")
    print("=" * 60)

    backend_active = is_port_in_use(8000)
    frontend_active = is_port_in_use(3000)

    backend_proc = None
    frontend_proc = None

    # 1. Start Backend if not already running
    if backend_active:
        print("  Backend:  ALREADY RUNNING at http://127.0.0.1:8000 (Docs: /docs)")
    else:
        print("  Backend:  Starting FastAPI at http://127.0.0.1:8000...")
        backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=backend_dir,
            shell=False
        )

    # 2. Start Frontend if not already running
    if frontend_active:
        print("  Frontend: ALREADY RUNNING at http://localhost:3000")
    else:
        print("  Frontend: Starting Vite at http://localhost:3000...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=frontend_dir,
            shell=(sys.platform == "win32")
        )

    print("=" * 60)

    # 3. Trigger auto-browser open in background
    browser_thread = threading.Thread(target=open_browser_when_ready, args=("http://localhost:3000",), daemon=True)
    browser_thread.start()

    # If both were already running, we opened the browser; pause briefly and let user know
    if backend_proc is None and frontend_proc is None:
        print("\nAll AI SupportPro services are already active.")
        print("Browser tab opened to http://localhost:3000.")
        print("Press Enter to close this launcher window (services will stay running)...")
        try:
            input()
        except Exception:
            time.sleep(2)
        return

    # Shutdown handler for spawned processes
    def shutdown(signum=None, frame=None):
        print("\nStopping AI SupportPro services...")
        if backend_proc:
            try:
                backend_proc.terminate()
            except Exception:
                pass
        if frontend_proc:
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
            if backend_proc and backend_proc.poll() is not None:
                print(f"Backend exited with code {backend_proc.returncode}")
                break
            if frontend_proc and frontend_proc.poll() is not None:
                print(f"Frontend exited with code {frontend_proc.returncode}")
                break
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
