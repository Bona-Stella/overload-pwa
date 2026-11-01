# Native vector primitives; no downloaded assets or image-generation dependency.
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null
foreach ($item in @(@('icon-192.png',192), @('icon-512.png',512), @('maskable-512.png',512), @('apple-touch-icon.png',180))) {
  $size = [int]$item[1]
  $bitmap = [System.Drawing.Bitmap]::new($size,$size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#101318'))
  $graphics.ScaleTransform($size/512.0,$size/512.0)
  $ring = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#3b82f6'),26)
  $white = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#f3f6fa'),22)
  $white.StartCap = $white.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawEllipse($ring,91,91,330,330)
  $graphics.DrawLine($white,156,256,356,256)
  $graphics.DrawLine($white,177,207,177,305)
  $graphics.DrawLine($white,335,207,335,305)
  $graphics.DrawLine($white,148,229,148,283)
  $graphics.DrawLine($white,364,229,364,283)
  $bitmap.Save((Join-Path $iconDirectory $item[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  $white.Dispose(); $ring.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
