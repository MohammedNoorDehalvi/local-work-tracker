$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8

$ProgressPreference = "SilentlyContinue"
$InformationPreference = "SilentlyContinue"

Add-Type -AssemblyName System.Windows.Forms

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select a folder for the Local Work Tracker to monitor (metadata only)"
$dialog.ShowNewFolderButton = $false

$result = $dialog.ShowDialog()

if ($result -eq [System.Windows.Forms.DialogResult]::OK -and -not [string]::IsNullOrWhiteSpace($dialog.SelectedPath)) {
    [Console]::Out.WriteLine($dialog.SelectedPath)
} else {
    [Console]::Out.WriteLine("")
}
[Console]::Out.Flush()
