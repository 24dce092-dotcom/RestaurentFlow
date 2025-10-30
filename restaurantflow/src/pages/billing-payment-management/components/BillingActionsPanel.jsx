import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { shouldSimulate } from '../../../utils/autoSim';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BillingActionsPanel = ({ 
  selectedTable, 
  onPrintBill, 
  onEmailReceipt, 
  onProcessPayment, 
  onExportPDF,
  onOpenEdit,
  editMode,
  onSaveEdit,
  onCancelEdit,
  onSetCustomerInfo
}) => {
  // printQueue feature removed per user request
  const [emailStatus, setEmailStatus] = useState(null);
  // paymentHistory is now provided by parent via prop
  const [isProcessing, setIsProcessing] = useState(false);

  // Print queue simulation removed

  // parent passes live paymentHistory via props.paymentHistory

  const handlePrintBill = async () => {
    if (!selectedTable) return;

    // Print queue removed: simply invoke parent print handler

    onPrintBill && onPrintBill(selectedTable);
  };

  const handleEmailReceipt = async () => {
    if (!selectedTable) return;
    const email = window.prompt('Enter recipient email address:', '');
    if (!email) return;
    setEmailStatus('sending');
    setIsProcessing(true);
    // Get the bill HTML
    const billNode = document.querySelector('.bill-preview-html');
    let billHtml = billNode ? billNode.outerHTML : '';
    billHtml = `<html><body style='font-family:sans-serif;background:#fff;'>${billHtml}</body></html>`;
    // Generate PDF as base64
    let pdfBase64 = '';
    if (billNode) {
      const canvas = await html2canvas(billNode, { backgroundColor: '#fff', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const y = Math.max(20, (pageHeight - imgHeight) / 2);
      pdf.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight);
      pdfBase64 = pdf.output('datauristring').split(',')[1];
    }
    try {
      const res = await fetch('http://localhost:5000/api/email-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Your Restaurant Bill',
          html: billHtml,
          pdfBase64,
          pdfFileName: `bill-table-${selectedTable?.tableNumber}-${Date.now()}.pdf`
        })
      });
      if (!res.ok) throw new Error('Failed to send email');
      setEmailStatus('sent');
    } catch (err) {
      alert('Failed to send email: ' + err.message);
      setEmailStatus(null);
    }
    setIsProcessing(false);
    onEmailReceipt && onEmailReceipt(selectedTable);
    setTimeout(() => setEmailStatus(null), 3000);
  };

  const handleExportPDF = async () => {
    // Delegate export to parent handler to avoid duplicate downloads
    if (!selectedTable) return;
    if (onExportPDF) {
      try {
        setIsProcessing(true);
        await onExportPDF(selectedTable);
      } finally {
        setIsProcessing(false);
      }
    } else {
      alert('Export handler not available.');
    }
  };

  const handleVoidTransaction = (transactionId) => {
    if (typeof onVoidPayment === 'function') onVoidPayment(transactionId);
  };

  

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Billing Actions</h2>
          {selectedTable && (
            <p className="text-sm text-muted-foreground mt-1">
              Table {selectedTable?.tableNumber} • {selectedTable?.guestCount} guests
            </p>
          )}
        </div>
        {/* Edit Bill / Save / Cancel buttons */}
        <div>
          {editMode ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof onCancelEdit === 'function') onCancelEdit();
                }}
                title="Cancel"
                className="px-2 py-1 text-sm border rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof onSaveEdit === 'function') onSaveEdit();
                }}
                title="Save"
                className="px-3 py-1 bg-primary text-white rounded"
              >
                Save
              </button>
            </div>
          ) : (
            typeof onOpenEdit === 'function' && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenEdit && onOpenEdit(); }}
                  title="Edit bill"
                  className="w-8 h-8 rounded border border-border bg-background flex items-center justify-center"
                >
                  <Icon name="Edit" size={14} />
                </button>
                {/* Customer info button: opens prompts to set customer name and GST and notifies parent */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    try {
                      const name = window.prompt('Enter customer name (leave blank to clear):', '');
                      if (name === null) return; // user cancelled
                      const gst = window.prompt('Enter customer GST number (optional):', '');
                      if (gst === null) return;
                      if (typeof onSetCustomerInfo === 'function') {
                        onSetCustomerInfo({ name: name?.trim() || '', gst: gst?.trim() || '' });
                      }
                    } catch (err) {
                      console.error('Failed to set customer info', err);
                    }
                  }}
                  title="Add customer info"
                  className="w-8 h-8 rounded border border-border bg-background flex items-center justify-center"
                >
                  <Icon name="User" size={14} />
                </button>
              </div>
            )
          )}
        </div>
      </div>
      {/* Main Actions - internal scrolling removed to rely on page-level scroll */}
      <div className="flex-1 p-4 space-y-4">
        {selectedTable ? (
          <>
            {/* Primary Actions */}
            <div className="space-y-3">
              <Button
                variant="default"
                fullWidth
                onClick={handlePrintBill}
                disabled={isProcessing}
                iconName="Printer"
                iconPosition="left"
              >
                Print Bill
              </Button>

              {/* Reprint Last Receipt button removed per user request */}

              <Button
                variant="outline"
                fullWidth
                onClick={handleEmailReceipt}
                disabled={isProcessing}
                loading={emailStatus === 'sending'}
                iconName={emailStatus === 'sent' ? 'Check' : 'Mail'}
                iconPosition="left"
              >
                {emailStatus === 'sent' ? 'Email Sent' : 'Email Receipt'}
              </Button>

              <Button
                variant="outline"
                fullWidth
                onClick={handleExportPDF}
                disabled={isProcessing}
                iconName="Download"
                iconPosition="left"
              >
                Export PDF
              </Button>
            </div>

            {/* Payment Actions */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Process Payment</h3>
              <div className="grid grid-cols-1 gap-2">
                {(() => {
                  const current = String(selectedTable?.paymentMethod || '').toLowerCase();
                  const makeHandler = (m) => () => {
                    // If already selected, do nothing
                    if (current && current === String(m).toLowerCase()) return;
                    // Always allow requesting a method change; parent will decide how to handle overwrite
                    onProcessPayment && onProcessPayment(m, selectedTable?.totalAmount);
                  };

                  const buttonFor = (m, icon, label) => (
                    <Button
                      key={m}
                      variant={current === String(m).toLowerCase() ? 'primary' : 'success'}
                      fullWidth
                      onClick={makeHandler(m)}
                      iconName={icon}
                      iconPosition="left"
                    >
                      {label}
                    </Button>
                  );

                  return (
                    <>
                      {buttonFor('cash', 'Banknote', 'Cash Payment')}
                      {buttonFor('card', 'CreditCard', 'Card Payment')}
                      {buttonFor('upi', 'Smartphone', 'UPI Payment')}
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 mx-auto">
              <Icon name="Receipt" size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select a table to access billing actions
            </p>
          </div>
        )}
      </div>
      {/* Print Queue feature removed */}
      {/* Payment history removed per user request */}
      {/* Quick stats removed */}
    </div>
  );
};

export default BillingActionsPanel;