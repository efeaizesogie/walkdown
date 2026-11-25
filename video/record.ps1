# Records the Chrome page area once Chrome is the foreground window.
#   powershell -File record.ps1 <name> <seconds>
param([string]$name, [int]$seconds = 20)
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class Fg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  public static string Title() { var sb = new StringBuilder(512); GetWindowText(GetForegroundWindow(), sb, 512); return sb.ToString(); }
}
"@
$deadline = (Get-Date).AddMinutes(5)
while (-not ([Fg]::Title() -like "*Google Chrome*")) {
  if ((Get-Date) -gt $deadline) { Write-Output "TIMEOUT: Chrome never came to the front"; exit 1 }
  Start-Sleep -Milliseconds 300
}
Write-Output ("RECORDING " + [Fg]::Title())
$out = Join-Path $PSScriptRoot ("takes\" + $name + ".mp4")
& ffmpeg -hide_banner -loglevel error -y -f gdigrab -framerate 30 -offset_x 0 -offset_y 177 -video_size 1920x855 -draw_mouse 0 -t $seconds -i desktop -c:v libx264 -preset ultrafast -crf 10 $out
Write-Output "DONE $out"
