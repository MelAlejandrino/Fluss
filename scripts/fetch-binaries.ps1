param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("windows", "macos", "linux")]
    [string]$Platform
)

$ErrorActionPreference = "Stop"

$Dest = "src-tauri/binaries/$Platform"
$Tmp = ".engines-tmp"

if (Test-Path $Tmp) {
    Remove-Item -Recurse -Force $Tmp
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
New-Item -ItemType Directory -Force -Path $Tmp | Out-Null

Write-Host "Fetching engines for $Platform into $Dest"

$FfmpegBase = "https://github.com/eugeneware/ffmpeg-static/releases/latest/download"

function Download-File {
    param([string]$Url, [string]$OutFile)
    Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
}

function Decompress-Gz {
    param([string]$GzPath, [string]$OutPath)
    $inputStream = [System.IO.File]::OpenRead($GzPath)
    $gzip = New-Object System.IO.Compression.GZipStream($inputStream, [System.IO.Compression.CompressionMode]::Decompress)
    $outputStream = [System.IO.File]::Create($OutPath)
    $buffer = New-Object byte[] 8192
    while ($true) {
        $read = $gzip.Read($buffer, 0, $buffer.Length)
        if ($read -eq 0) { break }
        $outputStream.Write($buffer, 0, $read)
    }
    $gzip.Close()
    $inputStream.Close()
    $outputStream.Close()
}

function Extract-Zip {
    param([string]$ZipPath, [string]$DestDir)
    Expand-Archive -Path $ZipPath -DestinationPath $DestDir -Force
}

switch ($Platform) {
    "windows" {
        Download-File "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" "$Dest/yt-dlp.exe"
        Download-File "$FfmpegBase/ffmpeg-win32-x64.gz" "$Tmp/ffmpeg.gz"
        Decompress-Gz "$Tmp/ffmpeg.gz" "$Dest/ffmpeg.exe"
        Download-File "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip" "$Tmp/deno.zip"
        Extract-Zip "$Tmp/deno.zip" $Dest
    }
    "macos" {
        Download-File "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" "$Dest/yt-dlp"
        Download-File "$FfmpegBase/ffmpeg-darwin-arm64.gz" "$Tmp/ffmpeg.gz"
        Decompress-Gz "$Tmp/ffmpeg.gz" "$Dest/ffmpeg"
        Download-File "https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip" "$Tmp/deno.zip"
        Extract-Zip "$Tmp/deno.zip" $Dest
    }
    "linux" {
        Download-File "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" "$Dest/yt-dlp"
        Download-File "$FfmpegBase/ffmpeg-linux-x64.gz" "$Tmp/ffmpeg.gz"
        Decompress-Gz "$Tmp/ffmpeg.gz" "$Dest/ffmpeg"
        Download-File "https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip" "$Tmp/deno.zip"
        Extract-Zip "$Tmp/deno.zip" $Dest
    }
}

Remove-Item -Recurse -Force $Tmp
Write-Host "Done:"
Get-ChildItem $Dest