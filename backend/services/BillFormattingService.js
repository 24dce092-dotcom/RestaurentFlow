import fs from 'fs';
import path from 'path';

class BillFormattingService {
    constructor() {
        this.templates = new Map();
        this.loadDefaultTemplates();
    }

    loadDefaultTemplates() {
        // Default receipt template
        this.templates.set('receipt', {
            width: 48,
            header: {
                showLogo: true,
                showRestaurantName: true,
                showAddress: true,
                showPhone: true
            },
            items: {
                showCustomizations: true,
                showPortion: true,
                showUnitPrice: false
            },
            footer: {
                showThankYou: true,
                showWebsite: false,
                customMessage: ''
            },
            formatting: {
                centerHeader: true,
                lineCharacter: '=',
                currency: 'USD',
                dateFormat: 'locale'
            }
        });

        // A4 template
        this.templates.set('a4', {
            width: 80,
            header: {
                showLogo: false,
                showRestaurantName: true,
                showAddress: true,
                showPhone: true
            },
            items: {
                showCustomizations: true,
                showPortion: true,
                showUnitPrice: true
            },
            footer: {
                showThankYou: true,
                showWebsite: true,
                customMessage: 'Thank you for your business!'
            },
            formatting: {
                centerHeader: true,
                lineCharacter: '-',
                currency: 'USD',
                dateFormat: 'full'
            }
        });

        // Kitchen receipt template (minimal for kitchen use)
        this.templates.set('kitchen', {
            width: 40,
            header: {
                showLogo: false,
                showRestaurantName: false,
                showAddress: false,
                showPhone: false
            },
            items: {
                showCustomizations: true,
                showPortion: true,
                showUnitPrice: false,
                showPrices: false
            },
            footer: {
                showThankYou: false,
                showWebsite: false,
                customMessage: ''
            },
            formatting: {
                centerHeader: false,
                lineCharacter: '-',
                currency: 'USD',
                dateFormat: 'time'
            }
        });
    }

    // Format bill using a specific template
    formatBill(bill, templateName = 'receipt', customConfig = {}) {
        const template = this.getTemplate(templateName);
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        // Merge custom configuration with template
        const config = this.mergeConfig(template, customConfig);

        switch (templateName) {
            case 'receipt':
                return this.formatReceipt(bill, config);
            case 'a4':
                return this.formatA4(bill, config);
            case 'kitchen':
                return this.formatKitchen(bill, config);
            default:
                return this.formatReceipt(bill, config);
        }
    }

    // Format for receipt printers (thermal/ESC-POS)
    formatReceipt(bill, config) {
        const width = config.width;
        const line = config.formatting.lineCharacter.repeat(width);
        let output = '';

        // Header
        if (config.header.showRestaurantName) {
            output += this.centerText('RESTAURANT FLOW', width) + '\n';
        }
        
        if (config.header.showAddress) {
            output += this.centerText('123 Food Street', width) + '\n';
            output += this.centerText('City, State 12345', width) + '\n';
        }
        
        if (config.header.showPhone) {
            output += this.centerText('Tel: (555) 123-4567', width) + '\n';
        }

        output += line + '\n';

        // Bill information
        output += `Bill #: ${bill.billNumber || 'N/A'}\n`;
        output += `Table: ${bill.tableNumber}\n`;
        output += `Date: ${this.formatDate(bill.createdAt, config.formatting.dateFormat)}\n`;
        
        if (bill.waiterName) {
            output += `Server: ${bill.waiterName}\n`;
        }

        output += line + '\n';

        // Items header
        if (config.items.showUnitPrice) {
            output += this.formatText('Item', 'Qty', 'Unit', 'Total', width) + '\n';
        } else {
            output += this.formatText('Item', 'Qty', 'Price', '', width) + '\n';
        }
        output += line + '\n';

        // Items
        let subtotal = 0;
        for (const item of bill.items) {
            const itemName = this.truncateText(item.name, width - 20);
            const qty = item.quantity.toString();
            const price = this.formatCurrency(item.price, config.formatting.currency);
            
            if (config.items.showUnitPrice) {
                const unitPrice = this.formatCurrency(item.price / item.quantity, config.formatting.currency);
                output += this.formatText(itemName, qty, unitPrice, price, width) + '\n';
            } else {
                output += this.formatText(itemName, qty, price, '', width) + '\n';
            }

            // Show portion if applicable
            if (config.items.showPortion && item.portion && item.portion !== 'full') {
                output += `  (${item.portion} portion)\n`;
            }

            // Show customizations
            if (config.items.showCustomizations && item.customizations) {
                const customizations = this.wrapText(item.customizations, width - 2);
                for (const line of customizations) {
                    output += `  ${line}\n`;
                }
            }

            subtotal += item.price;
        }

        output += line + '\n';

        // Totals
        output += this.rightAlign(`Subtotal: ${this.formatCurrency(subtotal, config.formatting.currency)}`, width) + '\n';
        
        // Calculate tax if applicable
        const taxRate = 0.08; // 8% tax - this could be configurable
        const tax = subtotal * taxRate;
        if (tax > 0) {
            output += this.rightAlign(`Tax (8%): ${this.formatCurrency(tax, config.formatting.currency)}`, width) + '\n';
        }

        output += this.rightAlign(`TOTAL: ${this.formatCurrency(bill.totalAmount, config.formatting.currency)}`, width) + '\n';
        output += line + '\n';

        // Footer
        if (config.footer.showThankYou) {
            output += this.centerText('Thank you for dining with us!', width) + '\n';
        }

        if (config.footer.customMessage) {
            const messageLines = this.wrapText(config.footer.customMessage, width);
            for (const line of messageLines) {
                output += this.centerText(line, width) + '\n';
            }
        }

        if (config.footer.showWebsite) {
            output += this.centerText('www.restaurantflow.com', width) + '\n';
        }

        output += '\n\n\n'; // Extra space for paper cutting

        return output;
    }

    // Format for A4 paper
    formatA4(bill, config) {
        const width = config.width;
        const line = config.formatting.lineCharacter.repeat(width);
        let output = '';

        // Header
        output += this.centerText('RESTAURANT FLOW', width) + '\n';
        output += this.centerText('Official Receipt', width) + '\n';
        output += line + '\n\n';

        // Restaurant information
        if (config.header.showAddress) {
            output += this.centerText('123 Food Street, City, State 12345', width) + '\n';
        }
        if (config.header.showPhone) {
            output += this.centerText('Phone: (555) 123-4567', width) + '\n';
        }
        output += '\n';

        // Bill information in table format
        output += 'Bill Information:\n';
        output += `  Bill Number: ${bill.billNumber || 'N/A'}\n`;
        output += `  Table Number: ${bill.tableNumber}\n`;
        output += `  Date & Time: ${this.formatDate(bill.createdAt, 'full')}\n`;
        if (bill.waiterName) {
            output += `  Server: ${bill.waiterName}\n`;
        }
        output += '\n';

        // Items table
        output += 'Order Details:\n';
        output += line + '\n';
        output += this.formatText('Item Description', 'Qty', 'Unit Price', 'Total', width) + '\n';
        output += line + '\n';

        let subtotal = 0;
        for (const item of bill.items) {
            const name = this.truncateText(item.name, 40);
            const qty = item.quantity.toString();
            const unitPrice = this.formatCurrency(item.price / item.quantity, config.formatting.currency);
            const total = this.formatCurrency(item.price, config.formatting.currency);

            output += this.formatText(name, qty, unitPrice, total, width) + '\n';

            if (item.portion && item.portion !== 'full') {
                output += `  Portion: ${item.portion}\n`;
            }

            if (item.customizations) {
                output += `  Special Instructions: ${item.customizations}\n`;
            }

            subtotal += item.price;
        }

        output += line + '\n';

        // Payment summary
        output += '\nPayment Summary:\n';
        output += this.rightAlign(`Subtotal: ${this.formatCurrency(subtotal, config.formatting.currency)}`, width) + '\n';
        
        const taxRate = 0.08;
        const tax = subtotal * taxRate;
        if (tax > 0) {
            output += this.rightAlign(`Tax (8%): ${this.formatCurrency(tax, config.formatting.currency)}`, width) + '\n';
        }

        output += this.rightAlign(`TOTAL AMOUNT: ${this.formatCurrency(bill.totalAmount, config.formatting.currency)}`, width) + '\n';
        output += line + '\n\n';

        // Footer
        if (config.footer.showThankYou) {
            output += this.centerText('Thank you for your business!', width) + '\n';
        }

        if (config.footer.customMessage) {
            output += this.centerText(config.footer.customMessage, width) + '\n';
        }

        if (config.footer.showWebsite) {
            output += this.centerText('Visit us at: www.restaurantflow.com', width) + '\n';
        }

        output += '\n\n';

        return output;
    }

    // Format for kitchen receipt (minimal information)
    formatKitchen(bill, config) {
        const width = config.width;
        const line = config.formatting.lineCharacter.repeat(width);
        let output = '';

        // Simple header
        output += this.centerText('KITCHEN ORDER', width) + '\n';
        output += line + '\n';

        // Basic info
        output += `Table: ${bill.tableNumber}\n`;
        output += `Time: ${this.formatDate(bill.createdAt, 'time')}\n`;
        output += `Bill #: ${bill.billNumber || 'N/A'}\n`;
        output += line + '\n';

        // Items without prices
        for (const item of bill.items) {
            output += `${item.quantity}x ${item.name}\n`;

            if (item.portion && item.portion !== 'full') {
                output += `   -> ${item.portion.toUpperCase()} PORTION\n`;
            }

            if (item.customizations) {
                const customizations = this.wrapText(`*** ${item.customizations} ***`, width);
                for (const line of customizations) {
                    output += `   ${line}\n`;
                }
            }
            output += '\n';
        }

        output += line + '\n';
        output += `Total Items: ${bill.items.reduce((sum, item) => sum + item.quantity, 0)}\n`;

        if (bill.waiterName) {
            output += `Server: ${bill.waiterName}\n`;
        }

        output += '\n\n';

        return output;
    }

    // Helper functions
    getTemplate(templateName) {
        return this.templates.get(templateName);
    }

    setTemplate(templateName, template) {
        this.templates.set(templateName, template);
    }

    mergeConfig(template, customConfig) {
        return {
            ...template,
            ...customConfig,
            header: { ...template.header, ...customConfig.header },
            items: { ...template.items, ...customConfig.items },
            footer: { ...template.footer, ...customConfig.footer },
            formatting: { ...template.formatting, ...customConfig.formatting }
        };
    }

    centerText(text, width) {
        const padding = Math.max(0, Math.floor((width - text.length) / 2));
        return ' '.repeat(padding) + text;
    }

    rightAlign(text, width) {
        const padding = Math.max(0, width - text.length);
        return ' '.repeat(padding) + text;
    }

    formatText(col1, col2, col3, col4, width) {
        if (!col4) {
            // Three columns
            const col1Width = Math.floor(width * 0.6);
            const col2Width = Math.floor(width * 0.15);
            const col3Width = width - col1Width - col2Width;

            return col1.padEnd(col1Width).substring(0, col1Width) +
                   col2.padStart(col2Width).substring(0, col2Width) +
                   col3.padStart(col3Width).substring(0, col3Width);
        } else {
            // Four columns
            const col1Width = Math.floor(width * 0.4);
            const col2Width = Math.floor(width * 0.1);
            const col3Width = Math.floor(width * 0.25);
            const col4Width = width - col1Width - col2Width - col3Width;

            return col1.padEnd(col1Width).substring(0, col1Width) +
                   col2.padStart(col2Width).substring(0, col2Width) +
                   col3.padStart(col3Width).substring(0, col3Width) +
                   col4.padStart(col4Width).substring(0, col4Width);
        }
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    wrapText(text, width) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            if ((currentLine + word).length <= width) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    formatCurrency(amount, currency = 'USD') {
        switch (currency.toLowerCase()) {
            case 'usd':
                return `$${amount.toFixed(2)}`;
            case 'eur':
                return `€${amount.toFixed(2)}`;
            case 'gbp':
                return `£${amount.toFixed(2)}`;
            case 'inr':
                return `₹${amount.toFixed(2)}`;
            default:
                return `${amount.toFixed(2)}`;
        }
    }

    formatDate(date, format = 'locale') {
        const d = new Date(date);

        switch (format) {
            case 'full':
                return d.toLocaleString();
            case 'date':
                return d.toLocaleDateString();
            case 'time':
                return d.toLocaleTimeString();
            case 'short':
                return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            default:
                return d.toLocaleString();
        }
    }

    // Save custom templates to file
    async saveTemplates() {
        try {
            const templatesPath = path.join(process.cwd(), 'bill-templates.json');
            const templates = Object.fromEntries(this.templates);
            fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
        } catch (error) {
            console.error('Failed to save templates:', error);
        }
    }

    // Load custom templates from file
    async loadTemplates() {
        try {
            const templatesPath = path.join(process.cwd(), 'bill-templates.json');
            
            if (fs.existsSync(templatesPath)) {
                const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
                
                for (const [name, template] of Object.entries(templates)) {
                    this.templates.set(name, template);
                }
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    // Get all available templates
    getAvailableTemplates() {
        return Array.from(this.templates.keys());
    }

    // Create a custom template
    createTemplate(name, template) {
        this.templates.set(name, template);
        return this.saveTemplates();
    }

    // Delete a template
    deleteTemplate(name) {
        if (['receipt', 'a4', 'kitchen'].includes(name)) {
            throw new Error('Cannot delete default templates');
        }

        const result = this.templates.delete(name);
        if (result) {
            this.saveTemplates();
        }
        return result;
    }
}

export default BillFormattingService;