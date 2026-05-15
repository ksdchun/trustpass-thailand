# Builds the polished demo assets owned by Agent D.
#
# Outputs:
#   public/evidence/wechat_casting.png       (hero - WeChat-style chat)
#   public/evidence/taxi_situation.png        (taxi meter / receipt)
#   public/evidence/motorbike_contract.png    (passport-retention contract)
#   public/evidence/line_tour_booking.png     (LINE chat for fake tour)
#   public/evidence/qr_mismatch.png           (QR payment screen)
#   public/evidence/jet_ski_damage.png        (damage demand chat)
#   public/evidence/tuktuk_detour.png         (tuk-tuk gem-shop detour)
#   public/trustpass-risk-ladder.png          (risk-level ladder)
#
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/build-agent-d-assets.ps1

Add-Type -AssemblyName System.Drawing

$RepoRoot = Split-Path -Parent $PSScriptRoot
$PublicEvidence = Join-Path $RepoRoot "public/evidence"
$PublicRoot = Join-Path $RepoRoot "public"
New-Item -ItemType Directory -Force -Path $PublicEvidence | Out-Null
New-Item -ItemType Directory -Force -Path $PublicRoot | Out-Null

function New-RoundedRect {
  param(
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height,
    [int]$Radius
  )
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Graphics {
  param([int]$Width, [int]$Height, [string]$BackgroundHex = "#FAFAFA")
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $bg = [System.Drawing.ColorTranslator]::FromHtml($BackgroundHex)
  $graphics.Clear($bg)
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Bitmap {
  param($Bundle, [string]$Path)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $Bundle.Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Bundle.Graphics.Dispose()
  $Bundle.Bitmap.Dispose()
  Write-Output "Wrote $Path"
}

function Draw-WatermarkBar {
  param(
    $G,
    [int]$Width,
    [string]$Text = "SYNTHETIC DEMO EVIDENCE - TRUSTPASS THAILAND"
  )
  $bar = [System.Drawing.ColorTranslator]::FromHtml("#0078D4")
  $G.FillRectangle((New-Object System.Drawing.SolidBrush $bar), 0, 0, $Width, 56)
  $font = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Bold)
  $G.DrawString($Text, $font, [System.Drawing.Brushes]::White, 20, 18)
  $font.Dispose()
}

function Draw-FooterStamp {
  param(
    $G,
    [int]$Width,
    [int]$Height,
    [string]$Text = "DEMO ONLY - NOT A REAL BUSINESS DOCUMENT"
  )
  $danger = [System.Drawing.ColorTranslator]::FromHtml("#A4262C")
  $font = New-Object System.Drawing.Font "Segoe UI", 12, ([System.Drawing.FontStyle]::Bold)
  $brush = New-Object System.Drawing.SolidBrush $danger
  $size = $G.MeasureString($Text, $font)
  $G.DrawString($Text, $font, $brush, ($Width - $size.Width) / 2, $Height - $size.Height - 20)
  $font.Dispose()
  $brush.Dispose()
}

# ------------------------------------------------------------------
# 1. HERO: WeChat casting lure (Wang Xing-style)
# ------------------------------------------------------------------

function Build-WechatCasting {
  $width = 1080
  $height = 2200
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#EDEDED"
  $g = $bundle.Graphics

  # Phone status bar
  $statusBar = [System.Drawing.ColorTranslator]::FromHtml("#202020")
  $g.FillRectangle((New-Object System.Drawing.SolidBrush $statusBar), 0, 0, $width, 56)
  $statusFont = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("9:41", $statusFont, [System.Drawing.Brushes]::White, 28, 18)
  $g.DrawString("5G  100%", $statusFont, [System.Drawing.Brushes]::White, $width - 130, 18)
  $statusFont.Dispose()

  # WeChat header
  $headerBg = [System.Drawing.ColorTranslator]::FromHtml("#EDEDED")
  $headerBorder = [System.Drawing.ColorTranslator]::FromHtml("#C8C8C8")
  $g.FillRectangle((New-Object System.Drawing.SolidBrush $headerBg), 0, 56, $width, 130)
  $g.DrawLine((New-Object System.Drawing.Pen $headerBorder, 1), 0, 186, $width, 186)

  # Back arrow + contact name
  $arrowFont = New-Object System.Drawing.Font "Segoe UI", 32, ([System.Drawing.FontStyle]::Regular)
  $g.DrawString("<", $arrowFont, [System.Drawing.Brushes]::Black, 22, 90)
  $arrowFont.Dispose()

  $nameFont = New-Object System.Drawing.Font "Segoe UI", 24, ([System.Drawing.FontStyle]::Bold)
  $nameBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#181818"))
  $nameSize = $g.MeasureString("Linda - Casting Bangkok", $nameFont)
  $g.DrawString("Linda - Casting Bangkok", $nameFont, $nameBrush, ($width - $nameSize.Width) / 2, 96)
  $nameFont.Dispose()
  $nameBrush.Dispose()

  $subFont = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Regular)
  $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7A7A7A"))
  $subText = "WeChat ID: linda_casting_bkk88"
  $subSize = $g.MeasureString($subText, $subFont)
  $g.DrawString($subText, $subFont, $subBrush, ($width - $subSize.Width) / 2, 148)
  $subFont.Dispose()
  $subBrush.Dispose()

  # Date separator
  $dateFont = New-Object System.Drawing.Font "Segoe UI", 13, ([System.Drawing.FontStyle]::Regular)
  $dateBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7A7A7A"))
  $dateText = "Today 14:22"
  $dateSize = $g.MeasureString($dateText, $dateFont)
  $datePill = New-RoundedRect ([int](($width - $dateSize.Width - 24) / 2)) 220 ([int]($dateSize.Width + 24)) 32 8
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#C8C8C8"))), $datePill)
  $g.DrawString($dateText, $dateFont, [System.Drawing.Brushes]::White, ($width - $dateSize.Width) / 2, 226)
  $dateFont.Dispose()
  $dateBrush.Dispose()

  # Chat bubbles
  $messageFont = New-Object System.Drawing.Font "Segoe UI", 20, ([System.Drawing.FontStyle]::Regular)
  $timeFont = New-Object System.Drawing.Font "Segoe UI", 12, ([System.Drawing.FontStyle]::Regular)
  $bubbleGreen = [System.Drawing.ColorTranslator]::FromHtml("#95EC69")
  $bubbleWhite = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
  $borderGrey = [System.Drawing.ColorTranslator]::FromHtml("#D8D8D8")
  $textInk = [System.Drawing.ColorTranslator]::FromHtml("#181818")
  $textTime = [System.Drawing.ColorTranslator]::FromHtml("#9A9A9A")

  $messages = @(
    @{ Side = "left"; Text = "Hello! Are you available for a paid casting job in Bangkok this Saturday?"; Time = "14:22" },
    @{ Side = "left"; Text = "Big international production. 50,000 THB per day, 3 day shoot."; Time = "14:22" },
    @{ Side = "right"; Text = "Yes I'm interested. How do I apply?"; Time = "14:24" },
    @{ Side = "left"; Text = "Great! Our driver will pick you up FREE from Suvarnabhumi. He will hold a sign with your name."; Time = "14:25" },
    @{ Side = "left"; Text = "Final interview is at our partner studio in Mae Sot (Tak province, beautiful border area). 5-6 hours drive but driver pays everything."; Time = "14:26" },
    @{ Side = "left"; Text = "Important: please do NOT tell your hotel or family about this job. Contract is confidential until signed."; Time = "14:27" },
    @{ Side = "right"; Text = "Mae Sot? That's the Myanmar border... is that normal?"; Time = "14:29" },
    @{ Side = "left"; Text = "Yes very normal for international productions. Bring your passport and phone, driver will hold them safe during the shoot."; Time = "14:30" }
  )

  $bubbleMaxWidth = 760
  $bubblePadX = 28
  $bubblePadY = 18
  $sideMargin = 40
  $y = 280

  foreach ($msg in $messages) {
    $textSize = $g.MeasureString($msg.Text, $messageFont, [int]($bubbleMaxWidth - 2 * $bubblePadX))
    $bw = [int]($textSize.Width + 2 * $bubblePadX)
    $bh = [int]($textSize.Height + 2 * $bubblePadY)

    if ($msg.Side -eq "left") {
      $bx = $sideMargin
      $color = $bubbleWhite
    } else {
      $bx = $width - $sideMargin - $bw
      $color = $bubbleGreen
    }

    $path = New-RoundedRect $bx $y $bw $bh 18
    $g.FillPath((New-Object System.Drawing.SolidBrush $color), $path)
    $g.DrawPath((New-Object System.Drawing.Pen $borderGrey, 1), $path)
    $rect = New-Object System.Drawing.RectangleF ($bx + $bubblePadX), ($y + $bubblePadY), ($bw - 2 * $bubblePadX), ($bh - 2 * $bubblePadY)
    $g.DrawString($msg.Text, $messageFont, (New-Object System.Drawing.SolidBrush $textInk), $rect)

    $timeY = $y + $bh + 6
    $timeSize = $g.MeasureString($msg.Time, $timeFont)
    if ($msg.Side -eq "left") {
      $g.DrawString($msg.Time, $timeFont, (New-Object System.Drawing.SolidBrush $textTime), $bx + 8, $timeY)
    } else {
      $g.DrawString($msg.Time, $timeFont, (New-Object System.Drawing.SolidBrush $textTime), $bx + $bw - $timeSize.Width - 8, $timeY)
    }

    $y = $timeY + 30
  }

  # Bottom input bar
  $inputY = $height - 100
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#F7F7F7"))), 0, $inputY, $width, 100)
  $g.DrawLine((New-Object System.Drawing.Pen $borderGrey, 1), 0, $inputY, $width, $inputY)
  $inputPath = New-RoundedRect 100 ($inputY + 22) ($width - 200) 56 28
  $g.FillPath([System.Drawing.Brushes]::White, $inputPath)
  $g.DrawPath((New-Object System.Drawing.Pen $borderGrey, 1), $inputPath)
  $iconFont = New-Object System.Drawing.Font "Segoe UI", 26, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("+", $iconFont, [System.Drawing.Brushes]::Black, ($width - 70), ($inputY + 30))
  $g.DrawString("~", $iconFont, [System.Drawing.Brushes]::Black, 30, ($inputY + 30))
  $iconFont.Dispose()

  $messageFont.Dispose()
  $timeFont.Dispose()

  # Top watermark - subtle to not break the realism
  $wFont = New-Object System.Drawing.Font "Segoe UI", 10, ([System.Drawing.FontStyle]::Bold)
  $wBg = [System.Drawing.ColorTranslator]::FromHtml("#A4262C")
  $wText = "  SYNTHETIC DEMO - TRUSTPASS THAILAND  "
  $wSize = $g.MeasureString($wText, $wFont)
  $wPath = New-RoundedRect ([int](($width - $wSize.Width) / 2)) 200 ([int]$wSize.Width) 18 6
  # uncomment if a visible watermark is desired in the chat area:
  # $g.FillPath((New-Object System.Drawing.SolidBrush $wBg), $wPath)
  # $g.DrawString($wText, $wFont, [System.Drawing.Brushes]::White, ($width - $wSize.Width) / 2, 202)
  $wFont.Dispose()

  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicEvidence "wechat_casting.png")
}

# ------------------------------------------------------------------
# 2. Taxi situation - phone-style screenshot showing meter + chat
# ------------------------------------------------------------------

function Build-TaxiSituation {
  $width = 1080
  $height = 1500
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#F4F4F4"
  $g = $bundle.Graphics
  Draw-WatermarkBar -G $g -Width $width

  # Taxi receipt card
  $cardX = 60
  $cardY = 110
  $cardW = $width - 120
  $cardH = 700
  $card = New-RoundedRect $cardX $cardY $cardW $cardH 16
  $g.FillPath([System.Drawing.Brushes]::White, $card)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#D8D6D4")), 1), $card)

  $titleFont = New-Object System.Drawing.Font "Segoe UI", 32, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("BANGKOK TAXI - METER PHOTO", $titleFont, [System.Drawing.Brushes]::Black, $cardX + 40, $cardY + 30)
  $titleFont.Dispose()

  $subFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular)
  $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7A7A7A"))
  $g.DrawString("Date: 12 May 2026  -  17:43  -  Plate: BKK 4892", $subFont, $subBrush, $cardX + 40, $cardY + 84)
  $subFont.Dispose()

  # Meter display
  $meterX = $cardX + 60
  $meterY = $cardY + 160
  $meter = New-RoundedRect $meterX $meterY 760 220 12
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1F1F1F"))), $meter)
  $meterLabelFont = New-Object System.Drawing.Font "Consolas", 20, ([System.Drawing.FontStyle]::Bold)
  $meterValueFont = New-Object System.Drawing.Font "Consolas", 60, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("METER", $meterLabelFont, [System.Drawing.Brushes]::White, $meterX + 30, $meterY + 30)
  $errorBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FF6B6B"))
  $g.DrawString("--- BROKEN ---", $meterValueFont, $errorBrush, $meterX + 30, $meterY + 80)
  $meterLabelFont.Dispose()
  $meterValueFont.Dispose()
  $errorBrush.Dispose()

  $lineFont = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Regular)
  $boldFont = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Bold)
  $dangerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#A4262C"))
  $inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#181818"))

  $rowY = $cardY + 420
  $g.DrawString("Driver said:", $lineFont, $inkBrush, $cardX + 60, $rowY)
  $rowY += 38
  $g.DrawString('"Meter broken today. Fixed price 800 baht."', $boldFont, $dangerBrush, $cardX + 60, $rowY)
  $rowY += 60
  $g.DrawString("Route requested:", $lineFont, $inkBrush, $cardX + 60, $rowY)
  $rowY += 38
  $g.DrawString("Siam Paragon -> Wat Pho (4.5 km)", $boldFont, $inkBrush, $cardX + 60, $rowY)
  $lineFont.Dispose()
  $boldFont.Dispose()
  $dangerBrush.Dispose()

  # Side-by-side fare reference
  $refX = 60
  $refY = $cardY + $cardH + 40
  $refW = $width - 120
  $refH = 460
  $refCard = New-RoundedRect $refX $refY $refW $refH 16
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FFF4CE"))), $refCard)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#FFB900")), 2), $refCard)

  $refTitleFont = New-Object System.Drawing.Font "Segoe UI", 24, ([System.Drawing.FontStyle]::Bold)
  $refRowFont = New-Object System.Drawing.Font "Segoe UI", 20, ([System.Drawing.FontStyle]::Regular)
  $g.DrawString("Reference - Bangkok metered fare", $refTitleFont, $inkBrush, $refX + 40, $refY + 30)
  $refTitleFont.Dispose()

  $rows = @(
    "Flag fall:             35 THB",
    "Typical Siam -> Wat Pho:  55 to 80 THB metered",
    "Quoted price tonight:    800 THB  (about 10x over)",
    "Meter refusal flag:      Yes",
    "Pre-trip price agreed:   No receipt",
    "Recommended next step:   Pause. Use Bolt or Grab app instead."
  )
  $rowY2 = $refY + 90
  foreach ($r in $rows) {
    $g.DrawString($r, $refRowFont, $inkBrush, $refX + 40, $rowY2)
    $rowY2 += 50
  }
  $refRowFont.Dispose()
  $inkBrush.Dispose()

  Draw-FooterStamp -G $g -Width $width -Height $height
  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicEvidence "taxi_situation.png")
}

# ------------------------------------------------------------------
# 3. Motorbike contract - passport-retention clause
# ------------------------------------------------------------------

function Build-MotorbikeContract {
  $width = 1080
  $height = 1500
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#FAFAFA"
  $g = $bundle.Graphics
  Draw-WatermarkBar -G $g -Width $width

  # Paper card
  $cardX = 60
  $cardY = 100
  $cardW = $width - 120
  $cardH = 1280
  $card = New-RoundedRect $cardX $cardY $cardW $cardH 12
  $g.FillPath([System.Drawing.Brushes]::White, $card)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#D8D6D4")), 1), $card)

  $titleFont = New-Object System.Drawing.Font "Georgia", 30, ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font "Georgia", 20, ([System.Drawing.FontStyle]::Regular)
  $boldFont = New-Object System.Drawing.Font "Georgia", 20, ([System.Drawing.FontStyle]::Bold)
  $dangerFont = New-Object System.Drawing.Font "Georgia", 22, ([System.Drawing.FontStyle]::Bold)
  $smallFont = New-Object System.Drawing.Font "Georgia", 16, ([System.Drawing.FontStyle]::Italic)

  $inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1A1A1A"))
  $dangerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#A4262C"))
  $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#5A5A5A"))

  $textX = $cardX + 50
  $tx = $cardX + 50
  $y = $cardY + 50
  $g.DrawString("MOTORBIKE RENTAL AGREEMENT", $titleFont, $inkBrush, $textX, $y)
  $y += 56
  $g.DrawString("PATTAYA BEACH RENTAL CO. LTD.", $boldFont, $mutedBrush, $textX, $y)
  $y += 32
  $g.DrawString("Contract no. PBR-2026-0512  -  Date: 12 May 2026", $smallFont, $mutedBrush, $textX, $y)
  $y += 60

  $headerFont = New-Object System.Drawing.Font "Georgia", 22, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("1. DEPOSIT AND IDENTITY DOCUMENTS", $headerFont, $inkBrush, $textX, $y)
  $y += 40

  $clauseRect = New-Object System.Drawing.RectangleF $textX, $y, ($cardW - 100), 200
  $clause1 = "The renter MUST surrender their ORIGINAL PASSPORT at the time of pickup. The passport will be held at the shop counter for the entire duration of the rental and will only be returned after the motorbike is inspected and all charges (rental, fuel, damage) are paid in CASH."
  $g.DrawString($clause1, $bodyFont, $inkBrush, $clauseRect)
  $y += 220

  $g.DrawString("2. DAMAGE ASSESSMENT", $headerFont, $inkBrush, $textX, $y)
  $y += 40
  $clause2 = "All damage will be assessed by the rental shop. Repair costs are decided by the shop owner. The renter agrees to pay the full quoted amount before the passport is returned."
  $g.DrawString($clause2, $bodyFont, $inkBrush, (New-Object System.Drawing.RectangleF $textX, $y, ($cardW - 100), 160))
  $y += 180

  $g.DrawString("3. DAILY LATE FEE", $headerFont, $inkBrush, $textX, $y)
  $y += 40
  $clause3 = "1,000 THB per day the bike is returned late. No insurance refund."
  $g.DrawString($clause3, $bodyFont, $inkBrush, (New-Object System.Drawing.RectangleF $textX, $y, ($cardW - 100), 80))
  $y += 80

  # Highlight box
  $hlX = $textX
  $hlY = $y + 16
  $hlW = $cardW - 100
  $hlH = 200
  $hlPath = New-RoundedRect $hlX $hlY $hlW $hlH 8
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FBE9EA"))), $hlPath)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#A4262C")), 2), $hlPath)
  $g.DrawString("RISK SIGNAL", $headerFont, $dangerBrush, $hlX + 24, $hlY + 16)
  $hlText = "Original passport leverage. Damage decided by shop. No third-party insurer. No police report path. Cash settlement only."
  $g.DrawString($hlText, $bodyFont, $dangerBrush, (New-Object System.Drawing.RectangleF ($hlX + 24), ($hlY + 60), ($hlW - 48), ($hlH - 80)))
  $y += $hlH + 40

  # Signature line
  $sigFont = New-Object System.Drawing.Font "Georgia", 18, ([System.Drawing.FontStyle]::Italic)
  $g.DrawString("Renter signature: _______________________     Shop stamp: [ stamped ]", $sigFont, $mutedBrush, $textX, $y)
  $sigFont.Dispose()

  $titleFont.Dispose()
  $bodyFont.Dispose()
  $boldFont.Dispose()
  $dangerFont.Dispose()
  $smallFont.Dispose()
  $headerFont.Dispose()
  $inkBrush.Dispose()
  $dangerBrush.Dispose()
  $mutedBrush.Dispose()

  Draw-FooterStamp -G $g -Width $width -Height $height
  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicEvidence "motorbike_contract.png")
}

# ------------------------------------------------------------------
# 4. LINE tour booking - chat with personal account ask
# ------------------------------------------------------------------

function Build-LineTourBooking {
  $width = 1080
  $height = 1600
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#86B5C7"
  $g = $bundle.Graphics

  Draw-WatermarkBar -G $g -Width $width

  # LINE-style green header (placed below the watermark bar)
  $headerBg = [System.Drawing.ColorTranslator]::FromHtml("#06C755")
  $g.FillRectangle((New-Object System.Drawing.SolidBrush $headerBg), 0, 56, $width, 130)
  $nameFont = New-Object System.Drawing.Font "Segoe UI", 26, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("Andaman Premium Tours", $nameFont, [System.Drawing.Brushes]::White, 40, 100)
  $subFont = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Regular)
  $g.DrawString("LINE Official Account - online", $subFont, [System.Drawing.Brushes]::White, 40, 148)
  $nameFont.Dispose()
  $subFont.Dispose()

  # Date pill
  $datePillFont = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Bold)
  $dateText = "  Today  "
  $dateSize = $g.MeasureString($dateText, $datePillFont)
  $datePill = New-RoundedRect ([int](($width - $dateSize.Width) / 2)) 220 ([int]$dateSize.Width) 32 16
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FFFFFF"))), $datePill)
  $g.DrawString($dateText, $datePillFont, [System.Drawing.Brushes]::Black, ($width - $dateSize.Width) / 2, 226)
  $datePillFont.Dispose()

  $msgFont = New-Object System.Drawing.Font "Segoe UI", 19, ([System.Drawing.FontStyle]::Regular)
  $boldFont = New-Object System.Drawing.Font "Segoe UI", 19, ([System.Drawing.FontStyle]::Bold)
  $timeFont = New-Object System.Drawing.Font "Segoe UI", 11, ([System.Drawing.FontStyle]::Regular)

  $sellerColor = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
  $userColor = [System.Drawing.ColorTranslator]::FromHtml("#84D061")
  $textColor = [System.Drawing.ColorTranslator]::FromHtml("#181818")
  $timeColor = [System.Drawing.ColorTranslator]::FromHtml("#F7F7F7")

  $messages = @(
    @{ Side = "left"; Text = "Sawatdee ka! Phi Phi private long-tail tour 2,999 THB per person."; Time = "10:14" },
    @{ Side = "left"; Text = "Departs tomorrow 7am. Only 2 seats left."; Time = "10:14" },
    @{ Side = "right"; Text = "Do you have a TAT license? And what is the included list?"; Time = "10:18" },
    @{ Side = "left"; Text = "Yes yes don't worry trusted operator 8 years."; Time = "10:19" },
    @{ Side = "left"; Text = "Please transfer FULL payment today to confirm booking:"; Time = "10:20" },
    @{ Side = "left"; Text = "Bank: Kasikorn  -  Acct 047-2-58892-1  -  Name: NATTAPONG SUWANNARAT"; Time = "10:20" },
    @{ Side = "right"; Text = "That looks like a personal account name. Is that correct?"; Time = "10:23" },
    @{ Side = "left"; Text = "Yes our company use owner personal account. Receipt sent after trip ok? Hurry seats almost gone."; Time = "10:24" }
  )

  $bubbleMaxWidth = 760
  $bubblePadX = 22
  $bubblePadY = 14
  $sideMargin = 40
  $y = 280

  foreach ($msg in $messages) {
    $textSize = $g.MeasureString($msg.Text, $msgFont, [int]($bubbleMaxWidth - 2 * $bubblePadX))
    $bw = [int]($textSize.Width + 2 * $bubblePadX)
    $bh = [int]($textSize.Height + 2 * $bubblePadY)
    if ($msg.Side -eq "left") {
      $bx = $sideMargin
      $color = $sellerColor
    } else {
      $bx = $width - $sideMargin - $bw
      $color = $userColor
    }
    $path = New-RoundedRect $bx $y $bw $bh 18
    $g.FillPath((New-Object System.Drawing.SolidBrush $color), $path)
    $rect = New-Object System.Drawing.RectangleF ($bx + $bubblePadX), ($y + $bubblePadY), ($bw - 2 * $bubblePadX), ($bh - 2 * $bubblePadY)
    $g.DrawString($msg.Text, $msgFont, (New-Object System.Drawing.SolidBrush $textColor), $rect)

    $tSize = $g.MeasureString($msg.Time, $timeFont)
    if ($msg.Side -eq "left") {
      $g.DrawString($msg.Time, $timeFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FFFFFF"))), $bx + $bw + 8, $y + $bh - 22)
    } else {
      $g.DrawString($msg.Time, $timeFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FFFFFF"))), $bx - $tSize.Width - 8, $y + $bh - 22)
    }
    $y += $bh + 22
  }

  $msgFont.Dispose()
  $boldFont.Dispose()
  $timeFont.Dispose()

  Draw-FooterStamp -G $g -Width $width -Height $height
  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicEvidence "line_tour_booking.png")
}

# ------------------------------------------------------------------
# 5. QR mismatch - PromptPay-style payment screen
# ------------------------------------------------------------------

function Build-QrMismatch {
  $width = 1080
  $height = 1500
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#F4F4F4"
  $g = $bundle.Graphics
  Draw-WatermarkBar -G $g -Width $width

  $cardX = 60
  $cardY = 110
  $cardW = $width - 120
  $cardH = 1280
  $card = New-RoundedRect $cardX $cardY $cardW $cardH 16
  $g.FillPath([System.Drawing.Brushes]::White, $card)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#D8D6D4")), 1), $card)

  $bankFont = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("PromptPay / Bangkok Bank Mobile", $bankFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1A4D80"))), $cardX + 40, $cardY + 30)
  $bankFont.Dispose()

  $headerFont = New-Object System.Drawing.Font "Segoe UI", 34, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("Confirm payment", $headerFont, [System.Drawing.Brushes]::Black, $cardX + 40, $cardY + 80)
  $headerFont.Dispose()

  # Faux QR block
  $qrSize = 360
  $qrX = $cardX + ($cardW - $qrSize) / 2
  $qrY = $cardY + 160
  $g.FillRectangle([System.Drawing.Brushes]::White, $qrX, $qrY, $qrSize, $qrSize)
  $g.DrawRectangle((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#181818")), 2), $qrX, $qrY, $qrSize, $qrSize)
  $rng = New-Object Random 42
  for ($iy = 0; $iy -lt 18; $iy++) {
    for ($ix = 0; $ix -lt 18; $ix++) {
      if ($rng.Next(0, 2) -eq 1) {
        $g.FillRectangle([System.Drawing.Brushes]::Black, $qrX + 16 + $ix * 18, $qrY + 16 + $iy * 18, 18, 18)
      }
    }
  }
  # QR corner squares
  $g.FillRectangle([System.Drawing.Brushes]::White, $qrX + 8, $qrY + 8, 80, 80)
  $g.DrawRectangle((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#181818")), 5), $qrX + 16, $qrY + 16, 64, 64)
  $g.FillRectangle([System.Drawing.Brushes]::Black, $qrX + 32, $qrY + 32, 32, 32)
  $g.FillRectangle([System.Drawing.Brushes]::White, $qrX + $qrSize - 88, $qrY + 8, 80, 80)
  $g.DrawRectangle((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#181818")), 5), $qrX + $qrSize - 80, $qrY + 16, 64, 64)
  $g.FillRectangle([System.Drawing.Brushes]::Black, $qrX + $qrSize - 64, $qrY + 32, 32, 32)
  $g.FillRectangle([System.Drawing.Brushes]::White, $qrX + 8, $qrY + $qrSize - 88, 80, 80)
  $g.DrawRectangle((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#181818")), 5), $qrX + 16, $qrY + $qrSize - 80, 64, 64)
  $g.FillRectangle([System.Drawing.Brushes]::Black, $qrX + 32, $qrY + $qrSize - 64, 32, 32)

  $labelFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular)
  $valueFont = New-Object System.Drawing.Font "Segoe UI", 24, ([System.Drawing.FontStyle]::Bold)
  $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7A7A7A"))
  $inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#181818"))
  $dangerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#A4262C"))

  $rowY = $qrY + $qrSize + 60
  $rowX = $cardX + 60
  $rowW = $cardW - 120

  $g.DrawString("Business shown to you", $labelFont, $mutedBrush, $rowX, $rowY)
  $g.DrawString("Andaman Premium Tours Co. Ltd.", $valueFont, $inkBrush, $rowX, $rowY + 28)
  $rowY += 90

  $g.DrawString("Account name on QR", $labelFont, $mutedBrush, $rowX, $rowY)
  $g.DrawString("SOMCHAI K.   (personal account)", $valueFont, $dangerBrush, $rowX, $rowY + 28)
  $rowY += 90

  $g.DrawString("Account number", $labelFont, $mutedBrush, $rowX, $rowY)
  $g.DrawString("xxx-x-58892-1", $valueFont, $inkBrush, $rowX, $rowY + 28)
  $rowY += 90

  $g.DrawString("Amount", $labelFont, $mutedBrush, $rowX, $rowY)
  $g.DrawString("8,500.00 THB", $valueFont, $inkBrush, $rowX, $rowY + 28)
  $rowY += 110

  # Confirm button
  $btnW = $rowW
  $btnH = 80
  $btnPath = New-RoundedRect $rowX $rowY $btnW $btnH 12
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#1A4D80"))), $btnPath)
  $btnFont = New-Object System.Drawing.Font "Segoe UI", 24, ([System.Drawing.FontStyle]::Bold)
  $btnText = "Confirm and pay 8,500.00 THB"
  $btnSize = $g.MeasureString($btnText, $btnFont)
  $g.DrawString($btnText, $btnFont, [System.Drawing.Brushes]::White, $rowX + ($btnW - $btnSize.Width) / 2, $rowY + 22)
  $btnFont.Dispose()

  $labelFont.Dispose()
  $valueFont.Dispose()
  $mutedBrush.Dispose()
  $inkBrush.Dispose()
  $dangerBrush.Dispose()

  Draw-FooterStamp -G $g -Width $width -Height $height
  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicEvidence "qr_mismatch.png")
}

# ------------------------------------------------------------------
# 6. Jet-ski damage - cash pressure demand
# ------------------------------------------------------------------

function Build-JetSkiDamage {
  $width = 1080
  $height = 1500
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#EDEDED"
  $g = $bundle.Graphics

  Draw-WatermarkBar -G $g -Width $width

  # WhatsApp-ish header (placed below the watermark bar)
  $headerBg = [System.Drawing.ColorTranslator]::FromHtml("#075E54")
  $g.FillRectangle((New-Object System.Drawing.SolidBrush $headerBg), 0, 56, $width, 130)
  $nameFont = New-Object System.Drawing.Font "Segoe UI", 26, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("Patong Beach Rental", $nameFont, [System.Drawing.Brushes]::White, 40, 90)
  $subFont = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Regular)
  $g.DrawString("WhatsApp - online", $subFont, [System.Drawing.Brushes]::White, 40, 138)
  $nameFont.Dispose()
  $subFont.Dispose()

  $msgFont = New-Object System.Drawing.Font "Segoe UI", 19, ([System.Drawing.FontStyle]::Regular)
  $boldFont = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Bold)
  $timeFont = New-Object System.Drawing.Font "Segoe UI", 11, ([System.Drawing.FontStyle]::Regular)
  $sellerColor = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
  $userColor = [System.Drawing.ColorTranslator]::FromHtml("#DCF8C6")
  $textColor = [System.Drawing.ColorTranslator]::FromHtml("#181818")

  $messages = @(
    @{ Side = "left"; Text = "WE FOUND DAMAGE ON THE JET-SKI YOU JUST RETURNED."; Time = "16:02"; Bold = $true },
    @{ Side = "left"; Text = "Big scratch on hull + broken light. Repair quote 35,000 THB."; Time = "16:02" },
    @{ Side = "left"; Text = "Pay 35,000 THB CASH NOW or we keep your passport at the office."; Time = "16:03"; Bold = $true },
    @{ Side = "right"; Text = "We didn't damage anything. There was already a scratch when we picked it up."; Time = "16:05" },
    @{ Side = "left"; Text = "No discussion. No insurance claim. No police. Pay cash today. Boss is angry."; Time = "16:05" },
    @{ Side = "right"; Text = "Can you give a receipt and a written damage report?"; Time = "16:07" },
    @{ Side = "left"; Text = "NO RECEIPT. Cash only. Come back office immediately or we report YOU to police for damage."; Time = "16:08"; Bold = $true }
  )

  $bubbleMaxWidth = 760
  $bubblePadX = 22
  $bubblePadY = 14
  $sideMargin = 40
  $y = 220

  foreach ($msg in $messages) {
    $font = if ($msg.ContainsKey("Bold") -and $msg.Bold) { $boldFont } else { $msgFont }
    $textSize = $g.MeasureString($msg.Text, $font, [int]($bubbleMaxWidth - 2 * $bubblePadX))
    $bw = [int]($textSize.Width + 2 * $bubblePadX)
    $bh = [int]($textSize.Height + 2 * $bubblePadY)
    if ($msg.Side -eq "left") {
      $bx = $sideMargin
      $color = $sellerColor
    } else {
      $bx = $width - $sideMargin - $bw
      $color = $userColor
    }
    $path = New-RoundedRect $bx $y $bw $bh 16
    $g.FillPath((New-Object System.Drawing.SolidBrush $color), $path)
    $rect = New-Object System.Drawing.RectangleF ($bx + $bubblePadX), ($y + $bubblePadY), ($bw - 2 * $bubblePadX), ($bh - 2 * $bubblePadY)
    $g.DrawString($msg.Text, $font, (New-Object System.Drawing.SolidBrush $textColor), $rect)
    $y += $bh + 22
  }

  $msgFont.Dispose()
  $boldFont.Dispose()
  $timeFont.Dispose()

  Draw-FooterStamp -G $g -Width $width -Height $height
  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicEvidence "jet_ski_damage.png")
}

# ------------------------------------------------------------------
# 7. Tuk-tuk detour - temple closed / gem shop offer
# ------------------------------------------------------------------

function Build-TuktukDetour {
  $width = 1080
  $height = 1500
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#F4F4F4"
  $g = $bundle.Graphics
  Draw-WatermarkBar -G $g -Width $width

  $cardX = 60
  $cardY = 110
  $cardW = $width - 120
  $cardH = 1300
  $card = New-RoundedRect $cardX $cardY $cardW $cardH 16
  $g.FillPath([System.Drawing.Brushes]::White, $card)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#D8D6D4")), 1), $card)

  $titleFont = New-Object System.Drawing.Font "Segoe UI", 30, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("Tuk-tuk driver - outside Grand Palace", $titleFont, [System.Drawing.Brushes]::Black, $cardX + 40, $cardY + 30)
  $titleFont.Dispose()

  $subFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular)
  $g.DrawString("Spoken offer captured 11:14 by tourist (transcribed in note)", $subFont, (New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#7A7A7A"))), $cardX + 40, $cardY + 80)
  $subFont.Dispose()

  $msgFont = New-Object System.Drawing.Font "Segoe UI", 21, ([System.Drawing.FontStyle]::Regular)
  $boldFont = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Bold)
  $inkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#181818"))
  $dangerBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#A4262C"))

  $items = @(
    @{ Text = "Hello sir, Grand Palace CLOSED today. Royal ceremony."; Danger = $true },
    @{ Text = "Big sign say only Thai people allowed inside today. Foreigners must come back tomorrow."; Danger = $true },
    @{ Text = "I take you on special tour 4 places ONLY 40 baht: Lucky Buddha, Standing Buddha, Marble Temple, government shop."; Danger = $false },
    @{ Text = "Government gem shop have promotion this week, tax free for tourist only.";  Danger = $true },
    @{ Text = "If you buy gem you can re-sell in your country for 3x price. Many tourist make money this way."; Danger = $true },
    @{ Text = "Free stop, no obligation. Then I take you back to Grand Palace area for free.";  Danger = $false }
  )

  $y = $cardY + 150
  $padX = $cardX + 60
  $maxW = $cardW - 120
  foreach ($item in $items) {
    $brush = if ($item.Danger) { $dangerBrush } else { $inkBrush }
    $font = if ($item.Danger) { $boldFont } else { $msgFont }
    $rect = New-Object System.Drawing.RectangleF $padX, $y, $maxW, 200
    $textSize = $g.MeasureString($item.Text, $font, [int]$maxW)
    $g.DrawString($item.Text, $font, $brush, $rect)
    $y += [int]$textSize.Height + 30
  }

  $msgFont.Dispose()
  $boldFont.Dispose()

  # Fact box
  $factY = $y + 20
  $factH = 200
  $factPath = New-RoundedRect $padX $factY $maxW $factH 12
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FFF4CE"))), $factPath)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#FFB900")), 2), $factPath)
  $factTitleFont = New-Object System.Drawing.Font "Segoe UI", 22, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("Known pattern", $factTitleFont, $inkBrush, $padX + 24, $factY + 18)
  $factBodyFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular)
  $body = "Grand Palace is open daily 8:30-15:30. 'Closed today' followed by a gem shop detour is the classic Bangkok tuk-tuk scam pattern. Tourists are taken to commission-paying shops far from intended attractions."
  $g.DrawString($body, $factBodyFont, $inkBrush, (New-Object System.Drawing.RectangleF ($padX + 24), ($factY + 56), ($maxW - 48), ($factH - 70)))
  $factTitleFont.Dispose()
  $factBodyFont.Dispose()
  $inkBrush.Dispose()
  $dangerBrush.Dispose()

  Draw-FooterStamp -G $g -Width $width -Height $height
  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicEvidence "tuktuk_detour.png")
}

# ------------------------------------------------------------------
# 8. Risk ladder - vertical staircase with 4 levels
# ------------------------------------------------------------------

function Build-RiskLadder {
  $width = 1400
  $height = 788
  $bundle = New-Graphics -Width $width -Height $height -BackgroundHex "#FFFFFF"
  $g = $bundle.Graphics

  $titleFont = New-Object System.Drawing.Font "Segoe UI", 30, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString("TrustPass scam risk ladder", $titleFont, [System.Drawing.Brushes]::Black, 40, 30)
  $titleFont.Dispose()

  $subFont = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Regular)
  $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#616161"))
  $g.DrawString("Each level maps to one proportional action. Same colors used everywhere in the app.", $subFont, $mutedBrush, 40, 84)
  $subFont.Dispose()
  $mutedBrush.Dispose()

  $levels = @(
    @{
      Label = "LOW"
      Color = "#107C10"
      Example = "Cheap taxi fare. Normal market price. No suspicious signal."
      Action = "Verify before paying. No escalation."
    }
    @{
      Label = "CAUTION"
      Color = "#FFB900"
      Example = "Taxi meter refusal. Vague tour pricing. Slight over-reference fare."
      Action = "Ask hotel staff or a verified operator. Do not transfer yet."
    }
    @{
      Label = "HIGH"
      Color = "#D83B01"
      Example = "Personal-account transfer for a tour. Passport retention. Cash damage demand."
      Action = "Pause and verify. Escalate to 1155 if pressured, blocked, or threatened."
    }
    @{
      Label = "EMERGENCY"
      Color = "#A4262C"
      Example = "Mae Sot lure. Controlled transport. Secrecy + phone confiscation."
      Action = "Stop. Stay in a public place. Call Tourist Police 1155 or your embassy."
    }
  )

  $rowH = 145
  $rowGap = 12
  $rowY = 140
  foreach ($lvl in $levels) {
    $color = [System.Drawing.ColorTranslator]::FromHtml($lvl.Color)
    $rowPath = New-RoundedRect 40 $rowY ($width - 80) $rowH 14
    $g.FillPath((New-Object System.Drawing.SolidBrush $color), $rowPath)

    # Label chip
    $chipW = 240
    $chipH = 80
    $chipX = 60
    $chipY = $rowY + ($rowH - $chipH) / 2
    $chipPath = New-RoundedRect $chipX $chipY $chipW $chipH 12
    $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))), $chipPath)
    $labelFont = New-Object System.Drawing.Font "Segoe UI", 30, ([System.Drawing.FontStyle]::Bold)
    $labelBrush = New-Object System.Drawing.SolidBrush $color
    $labelSize = $g.MeasureString($lvl.Label, $labelFont)
    $g.DrawString($lvl.Label, $labelFont, $labelBrush, $chipX + ($chipW - $labelSize.Width) / 2, $chipY + ($chipH - $labelSize.Height) / 2)
    $labelFont.Dispose()
    $labelBrush.Dispose()

    # Text
    $textX = $chipX + $chipW + 30
    $textW = $width - 80 - $chipW - 60
    $exampleFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Bold)
    $g.DrawString($lvl.Example, $exampleFont, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF $textX, ($rowY + 26), $textW, 60))
    $exampleFont.Dispose()

    $actionFont = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Regular)
    $g.DrawString($lvl.Action, $actionFont, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF $textX, ($rowY + 80), $textW, 60))
    $actionFont.Dispose()

    $rowY += $rowH + $rowGap
  }

  Save-Bitmap -Bundle $bundle -Path (Join-Path $PublicRoot "trustpass-risk-ladder.png")
}

# ------------------------------------------------------------------
# Run all
# ------------------------------------------------------------------

Build-WechatCasting
Build-TaxiSituation
Build-MotorbikeContract
Build-LineTourBooking
Build-QrMismatch
Build-JetSkiDamage
Build-TuktukDetour
Build-RiskLadder

Write-Output "All Agent D assets generated."
