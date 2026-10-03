"""
Creates a Windows Desktop Shortcut for AI SupportPro.
Assigns Hotkey (Ctrl+Alt+S) and custom icon for one-click launching.
"""
import os
import sys
import subprocess
from pathlib import Path


def create_shortcut():
    project_dir = Path(__file__).resolve().parent.parent
    target_bat = project_dir / "start_dev.bat"

    # Possible Desktop locations
    possible_desktops = [
        Path(r"C:\Users\Dell\Desktop"),
        Path(os.path.expandvars(r"%USERPROFILE%\Desktop")),
        Path(r"C:\Users\Public\Desktop"),
    ]

    # Find valid Desktop paths
    valid_desktops = []
    for d in possible_desktops:
        if d.exists() and d not in valid_desktops:
            valid_desktops.append(d)

    if not valid_desktops:
        print("[!] No standard Desktop directory found.")
        return

    # PowerShell command to create .lnk via WScript.Shell
    for desktop in valid_desktops:
        shortcut_path = desktop / "AI SupportPro.lnk"
        
        ps_script = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{shortcut_path}")
$Shortcut.TargetPath = "{target_bat}"
$Shortcut.WorkingDirectory = "{project_dir}"
$Shortcut.WindowStyle = 1
$Shortcut.Hotkey = "Ctrl+Alt+S"
$Shortcut.Description = "One-Click Launcher for AI SupportPro"
$Shortcut.IconLocation = "$env:SystemRoot\\System32\\shell32.dll,14"
$Shortcut.Save()
"""
        try:
            res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
            if res.returncode == 0 and shortcut_path.exists():
                print(f"[OK] Successfully created Desktop Shortcut at: {shortcut_path}")
                print(f"     -> Target: {target_bat}")
                print(f"     -> Hotkey: Ctrl + Alt + S")
            else:
                print(f"[!] Warning for {shortcut_path}: {res.stderr}")
        except Exception as e:
            print(f"[!] Error creating shortcut: {e}")


if __name__ == "__main__":
    create_shortcut()
