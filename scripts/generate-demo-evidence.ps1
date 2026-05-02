Add-Type -AssemblyName System.Drawing

$OutputDir = Join-Path (Get-Location) "demo-evidence"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function New-DemoPng {
  param(
    [string]$FileName,
    [string]$Title,
    [string]$Subtitle,
    [string[]]$Lines,
    [string]$Accent = "#0078D4"
  )

  $width = 1080
  $height = 1500
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(250, 249, 248))

  $accentColor = [System.Drawing.ColorTranslator]::FromHtml($Accent)
  $ink = [System.Drawing.Color]::FromArgb(50, 49, 48)
  $muted = [System.Drawing.Color]::FromArgb(96, 94, 92)
  $panel = [System.Drawing.Color]::White
  $border = [System.Drawing.Color]::FromArgb(210, 208, 206)
  $danger = [System.Drawing.Color]::FromArgb(209, 52, 56)

  $titleFont = New-Object System.Drawing.Font "Segoe UI", 34, ([System.Drawing.FontStyle]::Bold)
  $subtitleFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular)
  $bodyFont = New-Object System.Drawing.Font "Segoe UI", 23, ([System.Drawing.FontStyle]::Regular)
  $smallFont = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Bold)
  $watermarkFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Bold)

  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $accentColor), 0, 0, $width, 118)
  $graphics.DrawString("TRUSTPASS SYNTHETIC DEMO EVIDENCE", $watermarkFont, [System.Drawing.Brushes]::White, 44, 40)

  $card = New-Object System.Drawing.Rectangle 54, 160, 972, 1180
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $panel), $card)
  $graphics.DrawRectangle((New-Object System.Drawing.Pen $border, 2), $card)

  $graphics.DrawString($Title, $titleFont, (New-Object System.Drawing.SolidBrush $ink), 94, 208)
  $graphics.DrawString($Subtitle, $subtitleFont, (New-Object System.Drawing.SolidBrush $muted), 96, 268)

  $y = 350
  foreach ($line in $Lines) {
    $brush = if ($line -match "DEMO ONLY|suspicious|urgent|passport|personal account|do not tell|cash immediately|no receipt") {
      New-Object System.Drawing.SolidBrush $danger
    } else {
      New-Object System.Drawing.SolidBrush $ink
    }
    $graphics.DrawString($line, $bodyFont, $brush, (New-Object System.Drawing.RectangleF 96, $y, 880, 72))
    $y += 74
  }

  $graphics.DrawString("DEMO ONLY - NOT A REAL BUSINESS DOCUMENT", $smallFont, (New-Object System.Drawing.SolidBrush $danger), 94, 1390)

  $path = Join-Path $OutputDir $FileName
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $bitmap.Dispose()
}

function Escape-PdfText {
  param([string]$Text)
  return $Text.Replace("\", "\\").Replace("(", "\(").Replace(")", "\)")
}

function New-DemoPdf {
  param(
    [string]$FileName,
    [string]$Title,
    [string[]]$Lines
  )

  $contentLines = @("BT", "/F1 12 Tf", "72 760 Td")
  $contentLines += "($((Escape-PdfText $Title))) Tj"
  $contentLines += "0 -28 Td"
  foreach ($line in $Lines) {
    $contentLines += "($((Escape-PdfText $line))) Tj"
    $contentLines += "0 -20 Td"
  }
  $contentLines += "ET"
  $stream = ($contentLines -join "`n")

  $objects = @(
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length $($stream.Length) >>`nstream`n$stream`nendstream"
  )

  $pdf = "%PDF-1.4`n"
  $offsets = @()
  for ($i = 0; $i -lt $objects.Count; $i++) {
    $offsets += ([System.Text.Encoding]::ASCII.GetByteCount($pdf))
    $pdf += "$($i + 1) 0 obj`n$($objects[$i])`nendobj`n"
  }

  $xrefOffset = [System.Text.Encoding]::ASCII.GetByteCount($pdf)
  $pdf += "xref`n0 $($objects.Count + 1)`n"
  $pdf += "0000000000 65535 f `n"
  foreach ($offset in $offsets) {
    $pdf += ("{0:D10} 00000 n `n" -f $offset)
  }
  $pdf += "trailer`n<< /Size $($objects.Count + 1) /Root 1 0 R >>`nstartxref`n$xrefOffset`n%%EOF"

  [System.IO.File]::WriteAllBytes((Join-Path $OutputDir $FileName), [System.Text.Encoding]::ASCII.GetBytes($pdf))
}

New-DemoPng `
  -FileName "01-jay-fai-menu-expensive-no-name.png" `
  -Title "Menu Photo" `
  -Subtitle "Restaurant name not visible" `
  -Accent "#0078D4" `
  -Lines @(
    "Crab omelette ............... 1,500 baht",
    "Drunken noodles seafood ..... 800 baht",
    "Crab curry .................. 1,200 baht",
    "Cash / QR accepted",
    "No restaurant name visible in this crop"
  )

New-DemoPng `
  -FileName "02-fake-tour-line-payment.png" `
  -Title "LINE Tour Offer" `
  -Subtitle "Island tour payment request" `
  -Accent "#107C10" `
  -Lines @(
    "Phi Phi private tour: 2,999 THB per person",
    "Full payment today only",
    "Transfer to personal account: Nattapong S.",
    "No license number shown",
    "Limited time offer - urgent"
  )

New-DemoPng `
  -FileName "03-qr-payment-name-mismatch.png" `
  -Title "QR Payment Screen" `
  -Subtitle "Tour company name does not match account" `
  -Accent "#5C2D91" `
  -Lines @(
    "Business shown: Andaman Premium Tours",
    "QR account name: Somchai K.",
    "Amount: 8,500 THB",
    "Please scan to pay now",
    "Receipt will be sent later"
  )

New-DemoPdf `
  -FileName "04-motorbike-rental-passport-contract.pdf" `
  -Title "SYNTHETIC MOTORBIKE RENTAL AGREEMENT" `
  -Lines @(
    "DEMO ONLY - NOT A REAL CONTRACT",
    "Rental shop requires original passport deposit until bike is returned.",
    "Damage policy unclear. Repair cost decided by shop.",
    "Deposit: 5,000 THB. Passport held at counter.",
    "Customer must pay cash before passport is returned."
  )

New-DemoPng `
  -FileName "05-jetski-damage-cash-pressure.png" `
  -Title "Rental Damage Claim" `
  -Subtitle "Beach rental dispute message" `
  -Accent "#D13438" `
  -Lines @(
    "You scratched the jet ski.",
    "Pay cash immediately: 20,000 baht",
    "No police. No insurance. No receipt.",
    "If you do not pay, we keep your passport.",
    "Come to the back office now."
  )

New-DemoPng `
  -FileName "06-fake-casting-mae-sot-lure.png" `
  -Title "Casting Job Chat" `
  -Subtitle "Suspicious pickup and secrecy instructions" `
  -Accent "#D13438" `
  -Lines @(
    "Paid photoshoot casting in Thailand",
    "Free airport pickup. Driver will pick you up.",
    "Go to Mae Sot for final interview",
    "Do not tell hotel or friends",
    "Keep this secret until you arrive"
  )

New-DemoPng `
  -FileName "07-tuktuk-temple-closed-gem-shop.png" `
  -Title "Tuk-tuk Offer" `
  -Subtitle "Detour to shop after attraction claim" `
  -Accent "#FFB900" `
  -Lines @(
    "Grand Palace closed today",
    "I take you to government gem shop",
    "Special price only today",
    "Free stop before temple",
    "Pay 400 baht fixed fare"
  )

Write-Output "Generated demo evidence in $OutputDir"
