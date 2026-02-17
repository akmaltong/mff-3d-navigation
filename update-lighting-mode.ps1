# Обновление appStore.ts - добавление custom режима

$content = Get-Content 'C:\Users\akmal\Desktop\Web_APP\brunosimonfolio-2025\MFF-NavApp_01\MFF-NavApp\src\store\appStore.ts' -Raw

# Добавляем 'custom' к типу LightingMode
$content = $content -replace "type LightingMode = 'sky' \| 'baked'", "type LightingMode = 'sky' | 'baked' | 'custom'"

# Меняем lightingMode по умолчанию на 'custom'
$content = $content -replace "lightingMode: 'baked' as LightingMode", "lightingMode: 'custom' as LightingMode"

# Сохранение
Set-Content -Path 'C:\Users\akmal\Desktop\Web_APP\brunosimonfolio-2025\MFF-NavApp_01\MFF-NavApp\src\store\appStore.ts' -Value $content -NoNewline -Encoding UTF8

Write-Host "Updated LightingMode to include 'custom'"
