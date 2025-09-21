# Simple PowerShell HTTP Server for Aircraft Management System
# This script creates a local HTTP server to serve the files and avoid CORS issues

$port = 8082
$rootPath = Get-Location

Write-Host "Starting HTTP Server on port $port..." -ForegroundColor Green
Write-Host "Root directory: $rootPath" -ForegroundColor Yellow
Write-Host "Open your browser and go to: http://localhost:$port" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server is running... Waiting for requests..." -ForegroundColor Green

try {
    while ($listener.IsListening) {
        # Wait for a request
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Get the requested file path
        $requestedPath = $request.Url.LocalPath
        if ($requestedPath -eq "/") {
            $requestedPath = "/index-debug.html"  # Default to debug version
        }
        
        $filePath = Join-Path $rootPath $requestedPath.TrimStart('/')
        
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - Request: $requestedPath" -ForegroundColor White
        
        if (Test-Path $filePath -PathType Leaf) {
            # File exists, serve it
            $content = Get-Content $filePath -Raw -Encoding UTF8
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
            
            # Set content type based on file extension
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($extension) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                default { $response.ContentType = "text/plain; charset=utf-8" }
            }
            
            $response.ContentLength64 = $buffer.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            
            Write-Host "  → Served: $filePath" -ForegroundColor Green
        } else {
            # File not found
            $notFoundMessage = "404 - File Not Found: $requestedPath"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($notFoundMessage)
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.StatusCode = 404
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            
            Write-Host "  → 404: $filePath" -ForegroundColor Red
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Server stopped or error occurred: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $listener.Stop()
    Write-Host "Server stopped." -ForegroundColor Yellow
}