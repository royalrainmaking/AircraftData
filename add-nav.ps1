$files = Get-ChildItem -Filter "*.html"
foreach ($file in $files) {
    if ($file.Name -eq "mission-hours.html") { continue }
    $content = Get-Content $file.FullName -Raw
    if ($content -match '<a href="mission-hours.html">') { continue }
    $newContent = $content -replace '<a href="maintenance-planning.html">', "<a href=`"mission-hours.html`">สรุปชั่วโมงภารกิจ</a>`r`n                <a href=`"maintenance-planning.html`">"
    Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
}
