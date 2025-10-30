import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { mergeItems } from '../../../utils/mergeBill';
import { apiUrl } from '../../../utils/api';
import { useRef } from 'react';

const BillPreviewPanel = ({ selectedTable, onPrintBill, onEmailReceipt, onProcessPayment, editMode = false, draftItems = [], onUpdateDraftItem, savingStatus = 'idle', debugSaveInfo = null, paymentHistory = [], onViewReceipt }) => {
  const [billDetails, setBillDetails] = useState(null);
  const [template, setTemplate] = useState({ restaurantName: 'RestaurantFlow', address: '123 Main Street, City', gstNumber: '', fssai: '' });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [tipAmount, setTipAmount] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  useEffect(() => {
    let mounted = true;
    // load bill template (restaurant meta + tax rates)
    (async () => {
      try {
        const resp = await fetch(apiUrl('/api/bill-template'));
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        if (!mounted) return;
        setTemplate({
          restaurantName: data.restaurantName || 'RestaurantFlow',
          address: data.address || '123 Main Street, City',
          gstNumber: data.gstNumber || '',
          fssai: data.fssai || '',
          cgst: Number(data.cgst || 0),
          sgst: Number(data.sgst || 0),
          serviceTax: Number(data.serviceTax || 0)
        });
      } catch (err) {
        // ignore - keep sensible defaults
        console.error('Failed to load bill template for preview', err);
      }
    })();

    if (selectedTable) {
      // Calculate bill details
      const subtotal = selectedTable?.items?.reduce((sum, item) => sum + (item?.price * item?.quantity), 0) || 0;
      const discountValue = discountType === 'percentage'
        ? (subtotal * discountAmount / 100)
        : discountAmount;
      const taxableAmount = subtotal - discountValue;

      // prefer template tax rates if present, else fallback to 8% total
      const cgst = Number(template?.cgst || 0);
      const sgst = Number(template?.sgst || 0);
      const serviceTax = Number(template?.serviceTax || 0);
      const sgstAmount = taxableAmount * (sgst / 100);
      const cgstAmount = taxableAmount * (cgst / 100);
      const serviceTaxAmount = taxableAmount * (serviceTax / 100);
      const tax = sgstAmount + cgstAmount + serviceTaxAmount;
      const total = taxableAmount + tax + tipAmount;

      setBillDetails({
        subtotal,
        discount: discountValue,
        tax,
        tip: tipAmount,
        total,
        cgst,
        sgst,
        serviceTax,
        cgstAmount,
        sgstAmount,
        serviceTaxAmount
      });
    }

    return () => { mounted = false; };
  }, [selectedTable, discountAmount, discountType, tipAmount, template]);

  // Listen for cross-tab updates to bill-template so preview refreshes
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('rf-updates');
      bc.onmessage = (ev) => {
        try {
          const msg = ev?.data || {};
          if (msg.topic === 'bill-template' && (msg.action === 'updated' || msg.action === 'edit')) {
            // reload template
            (async () => {
              try {
                const resp = await fetch(apiUrl('/api/bill-template'));
                if (!resp.ok) throw new Error(await resp.text());
                const data = await resp.json();
                setTemplate({
                  restaurantName: data.restaurantName || 'RestaurantFlow',
                  address: data.address || '123 Main Street, City',
                  gstNumber: data.gstNumber || '',
                  fssai: data.fssai || '',
                  cgst: Number(data.cgst || 0),
                  sgst: Number(data.sgst || 0),
                  serviceTax: Number(data.serviceTax || 0)
                });
              } catch (err) {
                console.error('Failed to reload bill template after update', err);
              }
            })();
          }
        } catch (e) {}
      };
    } catch (e) {}
    return () => { try { bc?.close(); } catch (e) {} };
  }, []);

  const handleDiscountApply = () => {
    setShowDiscountInput(false);
  };

  const handleTipSelect = (percentage) => {
    const base = billDetails || computeFallback();
    const tipValue = (base?.subtotal || 0) * (percentage / 100);
    setTipAmount(tipValue);
  };

  const formatCurrency = (amount) => {
    if (amount == null || Number.isNaN(Number(amount))) return 'Rs. 0.00';
    return `Rs. ${Number(amount).toFixed(2)}`;
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })?.format(date);
  };

  if (!selectedTable) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
            <Icon name="Receipt" size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Table</h3>
          <p className="text-sm text-muted-foreground">
            Choose a table from the left panel to view and generate the bill
          </p>
        </div>
      </div>
    );
  }

  // If billDetails hasn't been computed by the effect yet, compute a fallback synchronously
  const computeFallback = () => {
    const subtotal = (selectedTable?.items || []).reduce((sum, item) => sum + ((Number(item?.price) || 0) * (Number(item?.quantity) || 0)), 0);
    const discountValue = discountType === 'percentage' ? (subtotal * discountAmount / 100) : discountAmount;
    const taxableAmount = subtotal - discountValue;
    const cgst = Number(template?.cgst || 0);
    const sgst = Number(template?.sgst || 0);
    const serviceTax = Number(template?.serviceTax || 0);
    const sgstAmount = taxableAmount * (sgst / 100);
    const cgstAmount = taxableAmount * (cgst / 100);
    const serviceTaxAmount = taxableAmount * (serviceTax / 100);
    const tax = sgstAmount + cgstAmount + serviceTaxAmount;
    const total = taxableAmount + tax + tipAmount;
    return {
      subtotal,
      discount: discountValue,
      tax,
      tip: tipAmount,
      total,
      cgst,
      sgst,
      serviceTax,
      cgstAmount,
      sgstAmount,
      serviceTaxAmount
    };
  };

  const usedBill = billDetails || computeFallback();

  return (
    <div className="h-full flex flex-col bg-card bill-preview-html">
  {/* Header (hide on export) */}
  <div className="p-6 border-b border-border hide-on-export relative">
    <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Table {selectedTable?.tableNumber} Bill
            </h2>
            {/* header metadata removed (guests / waiter / started time) per user request */}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(usedBill?.total)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Amount
            </div>
            {/* Paid / Remaining summary removed per user request */}
            {/* View Receipt quick link removed */}
              {savingStatus !== 'idle' && (
                <div className="mt-2 text-xs">
                  {savingStatus === 'saving' && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Saving…</span>}
                  {savingStatus === 'saved' && <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Saved</span>}
                  {savingStatus === 'error' && <span className="px-2 py-1 bg-red-100 text-red-800 rounded">Save failed</span>}
                </div>
              )}
              {/* Debug overlay removed — debugSaveInfo is kept for diagnostics but not shown in UI */}
          </div>
        </div>
      </div>
      {/* Bill Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Thermal-style Receipt Header */}
          <div className="text-center border-b border-border pb-4 font-mono">
            <h1 className="text-xl font-bold text-foreground">{template?.restaurantName || 'RestaurantFlow'}</h1>
            <p className="text-sm text-muted-foreground mt-1">{template?.address || '123 Main Street, City'}</p>
            <p className="text-sm text-muted-foreground">{template?.phone || ''}</p>
            <div className="my-2">-----------------------------------------</div>
            <div className="flex justify-between text-sm">
              <div>Bill No.</div>
              <div>{selectedTable?.billNumber || '—'}</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>Table No:</div>
              <div>{selectedTable?.tableNumber}</div>
            </div>
            <div className="flex justify-between text-sm">
              <div>DATE:</div>
              <div>{new Date().toLocaleDateString()}</div>
            </div>
            {/* Customer info: optional */}
            { (selectedTable?.customerName || selectedTable?.customerGst) && (
              <>
                <div className="flex justify-between text-sm">
                  <div>Customer:</div>
                  <div>{selectedTable?.customerName || '-'}</div>
                </div>
                <div className="flex justify-between text-sm">
                  <div>Customer GST:</div>
                  <div>{selectedTable?.customerGst || '-'}</div>
                </div>
              </>
            )}
            <div className="my-2">-----------------------------------------</div>
          </div>

          {/* Order Items as Description | Qty | Rate | Amount */}
          <div className="space-y-2 font-mono text-sm">
            <div className="flex font-medium border-b border-border pb-1">
              <div className="flex-1">Description</div>
              <div className="w-12 text-right">Qty</div>
              <div className="w-20 text-right">Rate</div>
              <div className="w-20 text-right">Amount</div>
            </div>
            {(() => {
              // Group items by base name for display, combining half and full portions
              const displayGroups = {};
              (selectedTable?.items || []).forEach(item => {
                const baseName = (item.name || '').trim();
                if (!baseName) return;
                const isHalf = item?.portion === 'half';
                const qty = Number(item.quantity || 0);
                const price = Number(item.price || 0);
                
                if (!displayGroups[baseName]) {
                  displayGroups[baseName] = {
                    name: baseName,
                    halfQuantity: 0,
                    fullQuantity: 0,
                    totalPrice: 0,
                    originalItem: item
                  };
                }
                if (isHalf) {
                  displayGroups[baseName].halfQuantity += qty;
                } else {
                  displayGroups[baseName].fullQuantity += qty;
                }
                displayGroups[baseName].totalPrice += (price * qty);
              });
              
              const groupedItems = Object.values(displayGroups).map(group => {
                const hasHalf = group.halfQuantity > 0;
                const hasFull = group.fullQuantity > 0;
                let quantityDisplay = '';
                
                if (hasHalf && hasFull) {
                  quantityDisplay = `${group.fullQuantity}+½`;
                } else if (hasHalf) {
                  quantityDisplay = '½';
                } else {
                  quantityDisplay = `${group.fullQuantity}`;
                }
                
                return {
                  name: group.name,
                  quantity: quantityDisplay,
                  price: group.totalPrice,
                  originalItem: group.originalItem
                };
              });
              
              return groupedItems.map((item, index) => {
                const draft = draftItems?.[index] || item.originalItem;
                const rateVal = draft?.price ?? item.originalItem?.price ?? 0;
                return (
                  <div key={index} className="flex items-start">
                    <div className="flex-1">
                      {item?.name}
                    </div>
                    <div className="w-12 text-right">{item.quantity}</div>
                    <div className="w-20 text-right">
                      {editMode ? (
                        <div className="relative group">
                          <input
                            type="number"
                            value={Number(rateVal)}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = Number(value);
                              
                              // Validate the input
                              if (value === '') {
                                onUpdateDraftItem && onUpdateDraftItem(index, { 
                                  price: 0,
                                  error: 'Rate is required'
                                });
                              } else if (isNaN(numValue)) {
                                onUpdateDraftItem && onUpdateDraftItem(index, { 
                                  price: 0,
                                  error: 'Invalid number'
                                });
                              } else if (numValue < 0) {
                                onUpdateDraftItem && onUpdateDraftItem(index, { 
                                  price: 0,
                                  error: 'Must be non-negative'
                                });
                              } else {
                                onUpdateDraftItem && onUpdateDraftItem(index, { 
                                  price: Number(numValue.toFixed(2)),
                                  error: null
                                });
                              }
                            }}
                            min="0"
                            step="0.01"
                            className={`w-full text-right px-1 py-0.5 border rounded text-sm
                              ${savingStatus === 'saving' ? 'bg-muted/20' : 'bg-white'}
                              ${draft?.error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary-200'}
                              focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200
                              ${draft?.error ? 'hover:border-red-400' : 'hover:border-primary/50'}
                              ${savingStatus === 'saving' ? 'cursor-wait' : 'cursor-text'}
                            `}
                            placeholder="0.00"
                            disabled={savingStatus === 'saving' || savingStatus === 'refreshing'}
                            aria-invalid={draft?.error ? 'true' : 'false'}
                            aria-describedby={draft?.error ? `rate-error-${index}` : undefined}
                            onKeyDown={(e) => {
                              // Allow arrow keys for navigation between rate inputs
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
                                const currentIndex = inputs.indexOf(e.target);
                                const nextIndex = e.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
                                if (nextIndex >= 0 && nextIndex < inputs.length) {
                                  inputs[nextIndex].focus();
                                }
                              }
                            }}
                          />
                          {draft?.error && (
                            <div 
                              id={`rate-error-${index}`}
                              role="alert"
                              className="absolute right-0 top-full mt-0.5 text-xs text-red-500 whitespace-nowrap bg-white px-1 py-0.5 border border-red-200 rounded shadow-sm opacity-0 group-focus-within:opacity-100 transition-opacity"
                            >
                              {draft.error}
                            </div>
                          )}
                        </div>
                      ) : (
                        Number(rateVal).toFixed(2)
                      )}
                    </div>
                    <div className="w-20 text-right">{Number(item.price).toFixed(2)}</div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="my-2">-----------------------------------------</div>

          {/* Totals and GST split */}
          <div className="font-mono text-sm space-y-1">
            <div className="flex justify-between">
              <div>Total Rs.</div>
              <div>{Number(usedBill?.subtotal || 0).toFixed(2)}</div>
            </div>
            <div className="flex justify-between">
              <div>SGST {Number(usedBill?.sgst || 0)}% Rs.</div>
              <div>{Number(usedBill?.sgstAmount || 0).toFixed(2)}</div>
            </div>
            <div className="flex justify-between">
              <div>CGST {Number(usedBill?.cgst || 0)}% Rs.</div>
              <div>{Number(usedBill?.cgstAmount || 0).toFixed(2)}</div>
            </div>
            {Number(usedBill?.serviceTax || 0) > 0 && (
              <div className="flex justify-between">
                <div>Service Tax {Number(usedBill?.serviceTax || 0)}% Rs.</div>
                <div>{Number(usedBill?.serviceTaxAmount || 0).toFixed(2)}</div>
              </div>
            )}

            <div className="my-2">-----------------------------------------</div>

            <div className="flex justify-between text-lg font-semibold">
              <div>Net Rs. :</div>
              <div>{Number(usedBill?.total || 0).toFixed(2)}</div>
            </div>

            <div className="text-xs text-center mt-3">
              GSTIN : {template?.gstNumber || '-'}<br />FSSAI: {template?.fssai || '-'}
            </div>
            <div className="text-center text-sm mt-2">&lt;&lt;VISIT AGAIN, THANK YOU&gt;&gt;</div>
          </div>

          {/* Discount Section - hide on export/print */}
          <div className="border-t border-border pt-4 hide-on-export">
            {!showDiscountInput ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiscountInput(true)}
                className="mb-4"
              >
                <Icon name="Percent" size={16} className="mr-2" />
                Apply Discount
              </Button>
            ) : (
              <div className="mb-4 p-4 bg-muted/20 rounded-lg">
                <h4 className="font-medium text-foreground mb-3">Apply Discount</h4>
                <div className="flex items-center space-x-3 mb-3">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e?.target?.value)}
                    className="px-3 py-2 border border-border rounded-md bg-background text-sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e?.target?.value) || 0)}
                    placeholder={discountType === 'percentage' ? '10' : '5.00'}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                  />
                  <Button size="sm" onClick={handleDiscountApply}>
                    Apply
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDiscountInput(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tip Section - hide on export/print */}
          <div className="border-t border-border pt-4 hide-on-export">
            <h4 className="font-medium text-foreground mb-3">Add Tip</h4>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[15, 18, 20, 25]?.map((percentage) => (
                <Button
                  key={percentage}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTipSelect(percentage)}
                  className={tipAmount === (usedBill?.subtotal * percentage / 100) ? 'border-primary bg-primary/10' : ''}
                >
                  {percentage}%
                </Button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Custom:</span>
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(parseFloat(e?.target?.value) || 0)}
                placeholder="0.00"
                className="w-24 px-2 py-1 border border-border rounded text-sm bg-background"
              />
            </div>
          </div>

          {/* Bill Summary - hide on export if needed */}
          <div className="border-t border-border pt-4 space-y-2 hide-on-export">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="text-foreground">{formatCurrency(usedBill?.subtotal)}</span>
            </div>
            
            {usedBill?.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-success">-{formatCurrency(usedBill?.discount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax:</span>
              <span className="text-foreground">{formatCurrency(usedBill?.tax)}</span>
            </div>
            
            {usedBill?.tip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tip:</span>
                <span className="text-foreground">{formatCurrency(usedBill?.tip)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
              <span className="text-foreground">Total:</span>
              <span className="text-foreground">{formatCurrency(usedBill?.total)}</span>
            </div>
          </div>

          {/* Recent edits / audit (hide on export) */}
          <div className="border-t border-border pt-4 hide-on-export">
            <h4 className="text-sm font-medium mb-2">Recent Edits</h4>
            {selectedTable?.edits?.length > 0 ? (
              <div className="text-xs text-muted-foreground space-y-2">
                {selectedTable.edits.slice(-3).reverse().map((e, idx) => (
                  <div key={idx} className="p-2 bg-muted/10 rounded">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{e.edBy || 'unknown'}</div>
                      <div className="text-muted-foreground">{new Date(e.edAt).toLocaleString()}</div>
                    </div>
                    <div className="text-xs mt-1">
                      {e.changes?.map((c, i) => (
                        <div key={i}>#{c.index + 1} {c.field}: {String(c.oldValue)} → {String(c.newValue)}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No edits recorded for this bill.</div>
            )}
          </div>

          {/* Payment Methods removed: buttons moved to Billing Actions panel on the right */}

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
            <p>Thank you for dining with us!</p>
            <p>Generated on {new Date()?.toLocaleDateString()} at {new Date()?.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPreviewPanel;