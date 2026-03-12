# Исправление всех файлов - замена \r\n на реальные newlines

$files = @(
    'C:\Users\akmal\Desktop\Web_APP\brunosimonfolio-2025\MFF-NavApp_01\MFF-NavApp\src\store\appStore.ts',
    'C:\Users\akmal\Desktop\Web_APP\brunosimonfolio-2025\MFF-NavApp_01\MFF-NavApp\src\components\Scene3D.tsx'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace '\\r\\n', "`r`n"
        Set-Content -Path $file -Value $content -NoNewline -Encoding UTF8
        Write-Host "Fixed: $file"
    } else {
        Write-Host "Not found: $file"
    }
}

Write-Host "Done!"
