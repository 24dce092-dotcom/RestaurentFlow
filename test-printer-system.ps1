# Printer System Test Script
# This PowerShell script tests the printer system functionality

Write-Host "==================================" -ForegroundColor Green
Write-Host "Restaurant Flow Printer System Test" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check if backend is running
$backendUrl = "http://localhost:5001"

try {
    $null = Invoke-RestMethod -Uri "$backendUrl/healthz" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server is not running. Please start with 'npm start' in backend folder" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Testing Printer Detection..." -ForegroundColor Yellow

# Test printer detection
try {
    $detectResponse = Invoke-RestMethod -Uri "$backendUrl/api/printers/detect" -Method POST -ContentType "application/json"
    
    if ($detectResponse.success) {
        Write-Host "✅ Printer detection successful" -ForegroundColor Green
        Write-Host "Found $($detectResponse.printers.Count) printers:" -ForegroundColor Cyan
        
        foreach ($printer in $detectResponse.printers) {
            Write-Host "  - $($printer.name) ($($printer.type)) - $($printer.status)" -ForegroundColor White
        }
        
        if ($detectResponse.defaultPrinter) {
            Write-Host "Default printer: $($detectResponse.defaultPrinter.name)" -ForegroundColor Cyan
        } else {
            Write-Host "No default printer set" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Printer detection failed: $($detectResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to detect printers: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Getting System Information..." -ForegroundColor Yellow

# Test system info
try {
    $systemInfo = Invoke-RestMethod -Uri "$backendUrl/api/system/info" -Method GET
    
    if ($systemInfo.success) {
        Write-Host "✅ System information retrieved" -ForegroundColor Green
        Write-Host "Platform: $($systemInfo.info.platform)" -ForegroundColor White
        Write-Host "Node Version: $($systemInfo.info.nodeVersion)" -ForegroundColor White
        Write-Host "Available Printers: $($systemInfo.info.availablePrinters)" -ForegroundColor White
        Write-Host "Supported Types: $($systemInfo.info.supportedTypes -join ', ')" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed to get system info: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing Printer List..." -ForegroundColor Yellow

# Get printer list
try {
    $printers = Invoke-RestMethod -Uri "$backendUrl/api/printers" -Method GET
    
    if ($printers.success -and $printers.printers.Count -gt 0) {
        Write-Host "✅ Retrieved printer list successfully" -ForegroundColor Green
        
        # Test the first printer
        $testPrinter = $printers.printers[0]
        Write-Host "Testing printer: $($testPrinter.name)" -ForegroundColor Yellow
        
        try {
            $testResult = Invoke-RestMethod -Uri "$backendUrl/api/printers/$($testPrinter.id)/test" -Method POST
            
            if ($testResult.success) {
                Write-Host "✅ Test print sent successfully to $($testPrinter.name)" -ForegroundColor Green
                Write-Host "Check your printer for the test page!" -ForegroundColor Cyan
            } else {
                Write-Host "❌ Test print failed: $($testResult.message)" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Test print error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test printer status
        Write-Host ""
        Write-Host "Checking printer status..." -ForegroundColor Yellow
        try {
            $status = Invoke-RestMethod -Uri "$backendUrl/api/printers/$($testPrinter.id)/status" -Method GET
            
            if ($status.success) {
                Write-Host "✅ Printer status retrieved" -ForegroundColor Green
                Write-Host "Status: $($status.status)" -ForegroundColor White
                Write-Host "Last checked: $($status.lastChecked)" -ForegroundColor White
            }
        } catch {
            Write-Host "❌ Failed to get printer status: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "⚠️  No printers found. This might be normal if no printers are connected." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to get printer list: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing Bill Printing..." -ForegroundColor Yellow

# Create a sample bill for testing
$sampleBill = @{
    billNumber = "TEST-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    tableNumber = 99
    waiterName = "Test Server"
    items = @(
        @{
            name = "Test Pizza"
            price = 15.99
            quantity = 2
            customizations = "Extra cheese, no olives"
            portion = "full"
        },
        @{
            name = "Test Drink"
            price = 3.50
            quantity = 1
            customizations = ""
            portion = "full"
        }
    )
    totalAmount = 35.48
    status = "pending"
    createdAt = Get-Date -Format "o"
}

try {
    $printResult = Invoke-RestMethod -Uri "$backendUrl/api/print-bill" -Method POST -Body ($sampleBill | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    if ($printResult.success) {
        Write-Host "✅ Sample bill printed successfully!" -ForegroundColor Green
        Write-Host "Check your default printer for the sample bill!" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Sample bill printing failed: $($printResult.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Sample bill printing error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This might be normal if no default printer is set or no printers are available." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing Configuration Export/Import..." -ForegroundColor Yellow

# Test configuration export
try {
    $configExport = Invoke-RestMethod -Uri "$backendUrl/api/export-config" -Method GET
    Write-Host "✅ Configuration export successful" -ForegroundColor Green
    Write-Host "Export contains $($configExport.printers.Count) printer definitions" -ForegroundColor White
} catch {
    Write-Host "❌ Configuration export failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Printer System Test Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- If test prints were sent, check your printers" -ForegroundColor White
Write-Host "- Configure printers using the API endpoints" -ForegroundColor White
Write-Host "- Refer to PRINTER_SETUP_GUIDE.md for detailed setup instructions" -ForegroundColor White
Write-Host "- Check AUTO_PRINT_BILL_GUIDE.md for automatic printing setup" -ForegroundColor White

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Set a default printer: POST /api/printers/{id}/set-default" -ForegroundColor White
Write-Host "2. Configure printer settings: POST /api/printers/{id}/configure" -ForegroundColor White
Write-Host "3. Test with real bills from your application" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
