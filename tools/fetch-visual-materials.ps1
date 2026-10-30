$ErrorActionPreference = 'Stop'
$assetRoot = Join-Path $PSScriptRoot '..\assets\textures'
New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
$manifest = @()
foreach ($assetId in @('painted_plaster_wall', 'concrete_floor_02', 'red_brick')) {
  $files = Invoke-RestMethod -Uri "https://api.polyhaven.com/files/$assetId" -UserAgent 'PhuThuongGame/1.0 local asset preparation'
  foreach ($map in @(@('Diffuse', 'color'), @('nor_gl', 'normal'), @('rough', 'roughness'))) {
    $entry = $files.($map[0]).'1k'.jpg
    if (-not $entry.url -or -not $entry.url.StartsWith('https://dl.polyhaven.org/')) { throw "Missing approved 1k JPG: $assetId / $($map[0])" }
    $target = Join-Path $assetRoot "$assetId-$($map[1]).jpg"
    if (-not (Test-Path -LiteralPath $target) -or (Get-FileHash -LiteralPath $target -Algorithm MD5).Hash.ToLowerInvariant() -ne $entry.md5) {
      Invoke-WebRequest -Uri $entry.url -OutFile $target
    }
    if ((Get-FileHash -LiteralPath $target -Algorithm MD5).Hash.ToLowerInvariant() -ne $entry.md5) { throw "Checksum mismatch: $target" }
    $manifest += @{ asset = $assetId; map = $map[1]; source = "https://polyhaven.com/a/$assetId"; url = $entry.url; license = 'CC0-1.0'; md5 = $entry.md5; bytes = (Get-Item -LiteralPath $target).Length }
    Write-Output "$assetId / $($map[1]): $((Get-Item -LiteralPath $target).Length) bytes verified"
  }
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $assetRoot 'sources.json') -Encoding utf8
