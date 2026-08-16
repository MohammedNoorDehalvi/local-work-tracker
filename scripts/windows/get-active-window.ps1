param (
    [int]$PollingIntervalMs = 5000,
    [string]$IncludeWindowTitle = "false"
)

$shouldIncludeTitles = ($IncludeWindowTitle -eq "true" -or $IncludeWindowTitle -eq "1" -or $IncludeWindowTitle -eq "$true")

$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

$ProgressPreference = "SilentlyContinue"
$InformationPreference = "SilentlyContinue"
$VerbosePreference = "SilentlyContinue"

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32Helper {
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    [DllImport("kernel32.dll")]
    public static extern uint GetTickCount();

    public static uint GetIdleSeconds() {
        LASTINPUTINFO lii = new LASTINPUTINFO();
        lii.cbSize = (uint)Marshal.SizeOf(lii);
        if (GetLastInputInfo(ref lii)) {
            uint currentTicks = GetTickCount();
            uint idleTicks = currentTicks - lii.dwTime;
            return idleTicks / 1000;
        }
        return 0;
    }

    public static int GetProcessId(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return 0;
        uint procId = 0;
        GetWindowThreadProcessId(hWnd, out procId);
        return (int)procId;
    }

    public static string GetActiveWindowTitle(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return "";
        StringBuilder sb = new StringBuilder(512);
        int length = GetWindowTextW(hWnd, sb, 512);
        return length > 0 ? sb.ToString() : "";
    }
}
"@

while ($true) {
    try {
        $hwnd = [Win32Helper]::GetForegroundWindow()
        $appName = "Unknown"
        $executableName = $null
        $windowTitle = $null
        $idleSeconds = [Win32Helper]::GetIdleSeconds()
        $now = [DateTime]::UtcNow.ToString("o")

        if ($hwnd -ne [IntPtr]::Zero) {
            $procId = [Win32Helper]::GetProcessId($hwnd)

            if ($procId -gt 0) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    if ($proc) {
                        $appName = $proc.ProcessName
                        $executableName = "$($proc.ProcessName).exe"
                    }
                } catch {
                    # Ignore individual process query error
                }
            }

            # Source-level privacy: call GetWindowTextW ONLY when $shouldIncludeTitles is $true
            if ($shouldIncludeTitles) {
                $rawTitle = [Win32Helper]::GetActiveWindowTitle($hwnd)
                if (-not [string]::IsNullOrWhiteSpace($rawTitle)) {
                    $windowTitle = $rawTitle
                }
            }
        }

        $record = [ordered]@{
            appName        = $appName
            executableName = $executableName
            windowTitle    = $windowTitle
            idleSeconds    = [int]$idleSeconds
            timestamp      = $now
        }

        $json = $record | ConvertTo-Json -Compress
        [Console]::Out.WriteLine($json)
        [Console]::Out.Flush()
    }
    catch {
        [Console]::Error.WriteLine("Win32 Helper error: $_")
    }

    Start-Sleep -Milliseconds $PollingIntervalMs
}
