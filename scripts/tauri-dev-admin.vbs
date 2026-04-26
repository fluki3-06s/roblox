Option Explicit

Dim shell, fso, projectDir, appPath, devCmd
Set shell = CreateObject("Shell.Application")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName) & "\.."
appPath = projectDir & "\src-tauri\target\debug\app.exe"

' Start Next.js dev server hidden (no UAC, no visible terminal).
devCmd = "/c cd /d """ & projectDir & """ && npm run dev"
CreateObject("WScript.Shell").Run "cmd.exe " & devCmd, 0, False

' Give dev server a short head start, then elevate only the desktop app.
WScript.Sleep 1600

' UAC prompt now shows the app executable (not cmd/powershell).
shell.ShellExecute appPath, "", "", "runas", 1
