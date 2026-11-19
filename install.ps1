# 安装「血战到底」（Windows）：
#   irm https://raw.githubusercontent.com/huacnlee/mojang/main/install.ps1 | iex
# 可选：$env:MOJANG_VERSION = "v1.0.0" 指定版本；$env:MOJANG_DIR 指定安装目录。
$ErrorActionPreference = "Stop"

$Repo = "huacnlee/mojang"
$App = "血战到底"
$Asset = "mojang-windows-x86_64.zip"

if ($env:PROCESSOR_ARCHITECTURE -ne "AMD64") {
  throw "目前只提供 x86_64 的 Windows 版本"
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
  Write-Host "下载 $Asset …"
  $Zip = Join-Path $Tmp $Asset
  Invoke-WebRequest -UseBasicParsing "$Base/$Asset" -OutFile $Zip
  $Sums = (Invoke-WebRequest -UseBasicParsing "$Base/SHA256SUMS").Content
  if ($Sums -is [byte[]]) { $Sums = [System.Text.Encoding]::UTF8.GetString($Sums) }
  $Line = ($Sums -split "`n") | Where-Object { $_ -match "\s$([regex]::Escape($Asset))\s*$" } | Select-Object -First 1
  if (-not $Line) { throw "校验文件里没有 $Asset" }
  $Expected = ($Line -split "\s+")[0].ToLower()
  $Actual = (Get-FileHash $Zip -Algorithm SHA256).Hash.ToLower()
  if ($Expected -ne $Actual) { throw "校验和不符，文件可能已损坏" }

  $Unpacked = Join-Path $Tmp "unpacked"
  Expand-Archive $Zip -DestinationPath $Unpacked -Force
  $Inner = Get-ChildItem $Unpacked -Directory | Select-Object -First 1
  $Source = if ($Inner -and -not (Get-ChildItem $Unpacked -File -Filter *.exe)) { $Inner.FullName } else { $Unpacked }

  if (Test-Path $Dest) { Remove-Item -Recurse -Force $Dest }
  New-Item -ItemType Directory -Force (Split-Path $Dest) | Out-Null
  Move-Item $Source $Dest

  $Exe = Get-ChildItem $Dest -Filter *.exe | Select-Object -First 1
  if (-not $Exe) { throw "找不到程序文件" }

  $Shell = New-Object -ComObject WScript.Shell
  $Programs = [Environment]::GetFolderPath("Programs")
  $Link = $Shell.CreateShortcut((Join-Path $Programs "$App.lnk"))
  $Link.TargetPath = $Exe.FullName
  $Link.WorkingDirectory = $Dest
  $Link.Save()

  Write-Host "已安装到 $Dest"
  Write-Host "从开始菜单打开「$App」。"
} finally {
  Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
}
