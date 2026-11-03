Add-Type -AssemblyName System.Drawing

function Generate-MonoIcon($size, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $radius = [float]($size * 0.22)
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($rect.Right - $radius * 2, $rect.Y, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($rect.Right - $radius * 2, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()

    $color1 = [System.Drawing.Color]::FromArgb(255, 67, 136, 131)
    $color2 = [System.Drawing.Color]::FromArgb(255, 42, 100, 96)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $color1, $color2, 45.0)
    $g.FillPath($brush, $path)

    # Clean single-line 'mono' branding
    $fontSize = [float]($size * 0.22)
    $font = New-Object System.Drawing.Font('Trebuchet MS', $fontSize, [System.Drawing.FontStyle]::Bold)
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
    $textBrush = [System.Drawing.Brushes]::White

    $g.DrawString('mono', $font, $textBrush, $rect, $stringFormat)

    $dir = [System.IO.Path]::GetDirectoryName($outPath)
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated icon at $outPath"
}

Generate-MonoIcon 48 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png'
Generate-MonoIcon 72 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png'
Generate-MonoIcon 96 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png'
Generate-MonoIcon 144 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png'
Generate-MonoIcon 192 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'
Generate-MonoIcon 512 'C:/Users/CORE I7/.gemini/antigravity/brain/df1635bc-a354-49a8-bdf1-bc67e6bb655f/mono_app_logo_preview.png'
