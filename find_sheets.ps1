$content = Get-Content -Raw -Path sheet.html
# Try broader patterns
$matches = [regex]::Matches($content, 'sheetId":(\d+).{1,50}title":"([^"]+)"')
foreach ($m in $matches) {
    Write-Output ($m.Groups[1].Value + " : " + $m.Groups[2].Value)
}
$matches2 = [regex]::Matches($content, 'gid":(\d+).{1,50}name":"([^"]+)"')
foreach ($m in $matches2) {
    Write-Output ($m.Groups[1].Value + " : " + $m.Groups[2].Value)
}
