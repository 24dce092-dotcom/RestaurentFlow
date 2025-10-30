import PrinterService from './services/PrinterService.js';

console.log('Testing Restaurant Flow Printer System...');

async function testPrinterSystem() {
    try {
        console.log('Initializing printer service...');
        const printerService = new PrinterService();
        
        console.log('Detecting printers...');
        const printers = await printerService.detectPrinters();
        
        console.log(`Found ${printers.length} printers:`);
        printers.forEach(printer => {
            console.log(`- ${printer.name} (${printer.type}) - ${printer.status}`);
        });
        
        if (printers.length > 0) {
            console.log('\nTesting first printer...');
            const testResult = await printerService.testPrinter(printers[0].id);
            
            if (testResult.success) {
                console.log('✅ Test print successful!');
            } else {
                console.log('❌ Test print failed:', testResult.message);
            }
        }
        
        console.log('\nPrinter system test completed successfully!');
        
    } catch (error) {
        console.error('❌ Printer system test failed:', error.message);
    }
}

testPrinterSystem();