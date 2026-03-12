# Исправление appStore.ts - замена \r\n на реальные newlines

$content = Get-Content 'C:\Users\akmal\Desktop\Web_APP\brunosimonfolio-2025\MFF-NavApp_01\MFF-NavApp\src\store\appStore.ts' -Raw

# Замена литералов \r\n на реальные переводы строк
$content = $content -replace '\\r\\n', "`r`n"

# Сохранение
Set-Content -Path 'C:\Users\akmal\Desktop\Web_APP\brunosimonfolio-2025\MFF-NavApp_01\MFF-NavApp\src\store\appStore.ts' -Value $content -NoNewline -Encoding UTF8

Write-Host "Fixed!"
