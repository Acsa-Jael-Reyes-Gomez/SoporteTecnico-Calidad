$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sourcePath = Join-Path $rootDir "assets\\logo.png"
$outputPath = Join-Path $rootDir "assets\\icon.ico"

$cropX = 180
$cropY = 430
$cropSize = 680
$sizes = @(16, 24, 32, 48, 64, 128, 256)

function New-PngFrameBytes {
  param(
    [System.Drawing.Bitmap]$SourceBitmap,
    [int]$Size
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $target = [int][Math]::Round($Size * 0.94)
    $offset = [int](($Size - $target) / 2)
    $destRect = New-Object System.Drawing.Rectangle($offset, $offset, $target, $target)

    $graphics.DrawImage($SourceBitmap, $destRect)

    $memory = New-Object System.IO.MemoryStream
    try {
      $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
      return $memory.ToArray()
    } finally {
      $memory.Dispose()
    }
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

try {
  if (-not (Test-Path $sourcePath)) {
    throw "No se encontro el archivo fuente: $sourcePath"
  }

  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  try {
    $cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSize, $cropSize)
    $cropped = New-Object System.Drawing.Bitmap($cropSize, $cropSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($cropped)

    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage(
        $source,
        (New-Object System.Drawing.Rectangle(0, 0, $cropSize, $cropSize)),
        $cropRect,
        [System.Drawing.GraphicsUnit]::Pixel
      )
    } finally {
      $graphics.Dispose()
    }

    try {
      $frames = @()
      foreach ($size in $sizes) {
        $frames += [PSCustomObject]@{
          Size = $size
          Data = New-PngFrameBytes -SourceBitmap $cropped -Size $size
        }
      }

      $stream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
      $writer = New-Object System.IO.BinaryWriter($stream)

      try {
        $writer.Write([UInt16]0)
        $writer.Write([UInt16]1)
        $writer.Write([UInt16]$frames.Count)

        $offset = 6 + (16 * $frames.Count)
        foreach ($frame in $frames) {
          $dimensionByte = if ($frame.Size -ge 256) { [byte]0 } else { [byte]$frame.Size }

          $writer.Write($dimensionByte)
          $writer.Write($dimensionByte)
          $writer.Write([byte]0)
          $writer.Write([byte]0)
          $writer.Write([UInt16]1)
          $writer.Write([UInt16]32)
          $writer.Write([UInt32]$frame.Data.Length)
          $writer.Write([UInt32]$offset)

          $offset += $frame.Data.Length
        }

        foreach ($frame in $frames) {
          $writer.Write([byte[]]$frame.Data)
        }
      } finally {
        $writer.Close()
        $stream.Close()
      }
    } finally {
      $cropped.Dispose()
    }
  } finally {
    $source.Dispose()
  }

  [System.Environment]::Exit(0)
} catch {
  Write-Error $_
  [System.Environment]::Exit(1)
}
