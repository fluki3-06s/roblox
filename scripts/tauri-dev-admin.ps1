param(
  [switch]$NoPause,
  [switch]$LaunchHidden
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`"",
    "-LaunchHidden"
  )
  if ($NoPause) {
    $args += "-NoPause"
  }
  Start-Process -FilePath "powershell.exe" -Verb RunAs -WindowStyle Hidden -ArgumentList $args
  exit
}

Set-Location (Join-Path $PSScriptRoot "..")
if ($LaunchHidden) {
  $cmdArgs = '/c', "set ""PATH=$env:USERPROFILE\.cargo\bin;%PATH%"" && cd /d ""$((Get-Location).Path)"" && npm run tauri dev"
  Start-Process -FilePath "cmd.exe" -WindowStyle Hidden -ArgumentList $cmdArgs
  exit
} else {
  $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
  npm run tauri dev

  if (-not $NoPause) {
    Read-Host "Press Enter to close"
  }
}
