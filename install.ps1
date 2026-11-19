# Install Mojiang (Sichuan Mahjong, Xue Zhan Dao Di) on Windows:
#   irm https://huacnlee.github.io/mojang/install.ps1 | iex
# Optional: $env:MOJANG_VERSION = "v1.0.0" picks a release; $env:MOJANG_DIR picks the install directory.
# This file is ASCII only: it is served without a charset, which Windows PowerShell would misread.
$ErrorActionPreference = "Stop"

$Repo = "huacnlee/mojang"
$App = "Mojiang"
$Asset = "mojang-windows-x86_64.zip"

if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
  throw "Only x86_64 Windows builds are available for now."
}

$Base = if ($env:MOJANG_VERSION) {
  "https://github.com/$Repo/releases/download/$($env:MOJANG_VERSION)"
} else {
  "https://github.com/$Repo/releases/latest/download"
}
$Dest = if ($env:MOJANG_DIR) { $env:MOJANG_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\mojang" }

$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("mojang-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force $Tmp | Out-Null
try {
  Write-Host "Downloading $Asset ..."
  $Zip = Join-Path $Tmp $Asset
  Invoke-WebRequest -UseBasicParsing "$Base/$Asset" -OutFile $Zip
  $SumsFile = Join-Path $Tmp "SHA256SUMS"
  Invoke-WebRequest -UseBasicParsing "$Base/SHA256SUMS" -OutFile $SumsFile
  $Line = Get-Content $SumsFile | Where-Object { $_ -match "\s$([regex]::Escape($Asset))\s*$" } | Select-Object -First 1
  if (-not $Line) { throw "$Asset is missing from SHA256SUMS." }
  $Expected = ($Line -split "\s+")[0].ToLower()
  $Actual = (Get-FileHash $Zip -Algorithm SHA256).Hash.ToLower()
  if ($Expected -ne $Actual) { throw "Checksum mismatch: the download is damaged." }

  $Unpacked = Join-Path $Tmp "unpacked"
  Expand-Archive $Zip -DestinationPath $Unpacked -Force
  $Inner = Get-ChildItem $Unpacked -Directory | Select-Object -First 1
  $Source = if ($Inner -and -not (Get-ChildItem $Unpacked -File -Filter *.exe)) { $Inner.FullName } else { $Unpacked }

  if (Test-Path $Dest) { Remove-Item -Recurse -Force $Dest }
  New-Item -ItemType Directory -Force (Split-Path $Dest) | Out-Null
  Move-Item $Source $Dest

  $Exe = Get-ChildItem $Dest -Filter *.exe | Select-Object -First 1
  if (-not $Exe) { throw "The program was not found in the package." }

  $Shell = New-Object -ComObject WScript.Shell
  $Programs = [Environment]::GetFolderPath("Programs")
  $Link = $Shell.CreateShortcut((Join-Path $Programs "$App.lnk"))
  $Link.TargetPath = $Exe.FullName
  $Link.WorkingDirectory = $Dest
  $Link.Save()

  Write-Host "Installed to $Dest"
  Write-Host "Open $App from the Start menu."
} finally {
  Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
}
