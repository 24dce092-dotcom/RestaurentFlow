import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/ui/Header';
import ActiveTablesPanel from './components/ActiveTablesPanel';
import BillPreviewPanel from './components/BillPreviewPanel';
import BillingActionsPanel from './components/BillingActionsPanel';
// BillingEditModal removed in favor of inline editing UI
import PaymentModal from './components/PaymentModal';
import BillingHistoryPanel from './components/BillingHistoryPanel';
import AttemptHistoryModal from './components/AttemptHistoryModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import ReceiptPrint from './components/ReceiptPrint';
import { mergeItems } from '../../utils/mergeBill';
import { createRoot } from 'react-dom/client';

const BillingPaymentManagement = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [allTables, setAllTables] = useState([]);
  const [activeView, setActiveView] = useState('billing'); // 'billing' | 'history'
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, data: null });
  const [dailyStats, setDailyStats] = useState({
    totalRevenue: 0,
    billsGenerated: 0,
    pendingPayments: 0,
    averageTicket: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [paymentHistories, setPaymentHistories] = useState({}); // { [tableId]: [payments...] }
  // editModalOpen removed; using inline editMode and editedDraft instead
  const [editMode, setEditMode] = useState(false);
  const [editedDraft, setEditedDraft] = useState(null);
  const latestEditedDraftRef = useRef(null);
  const originalTableRef = useRef(null);
  const allowAutoPersistRef = useRef(true);
  const [savingStatus, setSavingStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error' | 'refreshing'
  const persistTimerRef = useRef(null);
  const [saveAttempts, setSaveAttempts] = useState([]);
  // Keep a ref to the latest edited draft to avoid stale closure issues
  useEffect(() => {
    latestEditedDraftRef.current = editedDraft;
  }, [editedDraft]);
  const [showAttemptHistory, setShowAttemptHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customerInfoByTable, setCustomerInfoByTable] = useState({});
  const [debugSaveInfo, setDebugSaveInfo] = useState({ lastAttempt: null, attempts: [] });
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Fetch all tables on component mount
  useEffect(() => {
    const fetchAllTables = async () => {
      try {
        const response = await fetch('/api/bills');
        if (response.ok) {
          const tables = await response.json();
          // Filter out bills that are already paid so they don't appear in Active Tables
          const activeOnly = (tables || []).filter(t => {
            if (!t) return false;
            if (t.status && String(t.status).toLowerCase() === 'paid') return false;
            if (t.paidAt) return false;
            if (t.isPaid) return false;
            if (Array.isArray(t.payments) && t.payments.some(p => p.status === 'completed' || p.status === 'paid')) return false;
            return true;
          });
          setAllTables(activeOnly);

          // Compute daily stats live: bills generated today and pending payments
          try {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const billsGeneratedToday = (tables || []).filter(b => {
              if (!b) return false;
              const created = b.createdAt ? new Date(b.createdAt) : null;
              return created && created >= startOfDay;
            }).length;

            const pendingPayments = (tables || []).filter(b => !(b.status && String(b.status).toLowerCase() === 'paid')).length;

            // Fetch payments to compute today's revenue
            let totalRevenueToday = 0;
            try {
              const respP = await fetch('/api/payments');
              if (respP.ok) {
                const payments = await respP.json();
                totalRevenueToday = (payments || []).filter(p => {
                  if (!p) return false;
                  const ts = p.timestamp ? new Date(p.timestamp) : new Date(p.createdAt || p.date || null);
                  return ts && ts >= startOfDay;
                }).reduce((s, p) => s + (Number(p.amount) || 0), 0);
              }
            } catch (e) { /* ignore payment fetch errors */ }

            setDailyStats({ totalRevenue: totalRevenueToday, billsGenerated: billsGeneratedToday, pendingPayments });
          } catch (e) {
            // Fallback to previous mock stats if computation fails
            setDailyStats({ totalRevenue: 0, billsGenerated: 0, pendingPayments: 0 });
          }
        } else {
          console.warn('Failed to fetch tables:', response.status);
        }
      } catch (error) {
        console.warn('Error fetching tables:', error);
      }
    };
    
    fetchAllTables();

    // Poll for updates every 10 seconds to keep the stats live
    const interval = setInterval(() => {
      fetchAllTables().catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Fetch payment histories for loaded tables
  useEffect(() => {
    if (!allTables || allTables.length === 0) return;
    (async () => {
      try {
        // Build a set of table numbers to query
        const numbers = allTables.map(t => t.tableNumber).filter(Boolean);
        // Fetch payments in bulk (server supports filtering by tableNumber individually)
        for (const num of numbers) {
          try {
            const resp = await fetch(`/api/payments?tableNumber=${encodeURIComponent(num)}`);
            if (!resp.ok) continue;
            const payments = await resp.json();
            const tableKey = (allTables.find(t => t.tableNumber === num)?._id) || (allTables.find(t => t.tableNumber === num)?.id) || `table-${num}`;
            setPaymentHistories(prev => ({ ...prev, [tableKey]: payments }));
          } catch (err) {
            // ignore per-table failures
          }
        }
      } catch (err) {
        console.warn('Failed to fetch payment histories:', err);
      }
    })();
  }, [allTables]);

  useEffect(() => {
    // Mock daily statistics
    const mockStats = {
      totalRevenue: 2847.50,
      billsGenerated: 47,
      pendingPayments: 3,
      averageTicket: 60.59
    };
    setDailyStats(mockStats);

    // Mock notifications
    const mockNotifications = [
      {
        id: 'notif-1',
        type: 'payment_request',
        message: 'Table 5 requested payment',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        tableNumber: 5
      },
      {
        id: 'notif-2',
        type: 'bill_printed',
        message: 'Bill printed for Table 12',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        tableNumber: 12
      }
    ];
    setNotifications(mockNotifications);
  }, []);
 
  const handleSelectTable = (table) => {
    setSelectedTable(table);
  };

  const handleSetCustomerInfo = (info) => {
    if (!selectedTable) return;
    const tableKey = selectedTable?._id || selectedTable?.id || `table-${selectedTable?.tableNumber}`;
    setCustomerInfoByTable(prev => ({ ...prev, [tableKey]: info }));
    // also update selectedTable object for immediate preview
    setSelectedTable(prev => ({ ...prev, customerName: info?.name || '', customerGst: info?.gst || '' }));
    // persist to server if your API supports it (not implemented here)
  };
  const handlePrintBill = async (table) => {
    console.log('Printing bill for table:', table?.tableNumber);
    // Fixed: Removed paymentMethodOverride reference - force refresh v2
    // Add notification
    setNotifications(prev => [{
      id: `print-${Date.now()}`,
      type: 'bill_printed',
      message: `Bill printed for Table ${table?.tableNumber}`,
      timestamp: new Date(),
      tableNumber: table?.tableNumber
    }, ...prev?.slice(0, 4)]);

    // Small delay to ensure state has updated
    await new Promise(resolve => setTimeout(resolve, 100));

    // Finalize bill: attempt to create a payment that covers the bill to mark it paid in backend
    try {
      const billId = table?._id || table?.id;
      const amount = Number(table?.totalAmount || 0);
      let savedPayment = null;

      if (billId && amount > 0) {
        try {
          // Use the selected payment method from selectedTable, not just table
          const paymentMethod = selectedTable?.paymentMethod || table?.paymentMethod || 'cash';
          console.log('Print Bill - Using payment method:', paymentMethod, 'from selectedTable:', selectedTable?.paymentMethod);
          const resp = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ billId, tableNumber: table?.tableNumber, method: paymentMethod, amount, reference: `print-auto-${Date.now()}` })
          });
          if (resp.ok) {
            savedPayment = await resp.json();
            console.log('Payment saved with method:', savedPayment?.method);
            // Update today's stats immediately when a payment is created via print
            try {
              setDailyStats(prev => ({
                ...prev,
                totalRevenue: (Number(prev?.totalRevenue) || 0) + (Number(savedPayment?.amount) || amount || 0),
                billsGenerated: (Number(prev?.billsGenerated) || 0) + 1
              }));
            } catch (e) { /* ignore stats update errors */ }
            // Broadcast payment-created event so history UI can pick it up immediately
            try {
              if (typeof window !== 'undefined' && window?.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('rf:payment-created', { detail: savedPayment }));
              }
            } catch (e) {}
          } else {
            console.warn('Failed to persist payment on print:', resp.status);
          }
        } catch (err) {
          console.warn('Persist payment on print failed:', err?.message || err);
        }
      }

      // Update local payment history UI for the table
      const tableKey = table?._id || table?.id || `table-${table?.tableNumber}`;
      if (savedPayment) {
        setPaymentHistories(prev => ({
          ...prev,
          [tableKey]: [savedPayment, ...(prev?.[tableKey] || [])].slice(0, 20)
        }));
      }

      // Remove the printed bill(s) from Active Tables so they move to History.
      setAllTables(prev => {
        if (!Array.isArray(prev)) return prev;
        return prev.filter(t => {
          if (!t) return true;
          // Simple match by table number and amount for now
          const sameTable = t.tableNumber === table?.tableNumber;
          const sameTotal = Math.abs((Number(t.totalAmount) || 0) - (Number(table?.totalAmount) || 0)) < 0.001;
          if (sameTable && sameTotal) return false;
          return true;
        });
      });

      // Clear selection so center and right panels don't show the deleted bill
      setSelectedTable(null);

      // Add a short deletion notification
      setNotifications(prev => [{ id: `deleted-${Date.now()}`, type: 'info', message: `Printed bill moved to History`, timestamp: new Date() }, ...prev?.slice(0,4)]);

    } catch (err) {
      console.error('Error during print-finalize:', err);
    }
  };

  const handleEmailReceipt = (table) => {
    console.log('Emailing receipt for table:', table?.tableNumber);
    // Add notification
    setNotifications(prev => [{
      id: `email-${Date.now()}`,
      type: 'email_sent',
      message: `Receipt emailed for Table ${table?.tableNumber}`,
      timestamp: new Date(),
      tableNumber: table?.tableNumber
    }, ...prev?.slice(0, 4)]);
  };

  const handleProcessPayment = (method, amount) => {
    if (!selectedTable) return;
    
    console.log('ProcessPayment - Setting payment method to:', method);
    // Always update the selectedTable's paymentMethod when a payment method is chosen
    setSelectedTable(prev => {
      const updated = prev ? ({ ...prev, paymentMethod: method }) : prev;
      console.log('Updated selectedTable in handleProcessPayment:', updated?.paymentMethod);
      return updated;
    });
    
    // Also update the allTables array immediately
    setAllTables(prev => prev ? prev.map(t => 
      (t && (t._id === selectedTable?._id || t.id === selectedTable?._id)) 
        ? { ...t, paymentMethod: method } 
        : t
    ) : prev);
    
    // If method is card or upi, assume payment has been made and mark completed immediately
    const m = String(method || '').toLowerCase();
    if (m === 'card' || m === 'upi') {
      console.log('ProcessPayment - Auto completing payment for method:', method);
      const paymentResult = {
        method,
        amount: amount || selectedTable?.totalAmount || 0,
        timestamp: new Date(),
        reference: `auto-${m}-${Date.now()}`
      };
      // Directly handle as completed payment (no internal card/UPI flow)
      handlePaymentComplete(paymentResult);
      return;
    }

    // For other methods (e.g., cash), open payment modal to capture details
    const paymentData = {
      tableNumber: selectedTable?.tableNumber,
      amount: amount,
      method: method,
      table: selectedTable
    };

    setPaymentModal({ isOpen: true, data: paymentData });
  };

  const handlePaymentComplete = (paymentResult) => {
    console.log('Payment completed:', paymentResult);
    
    // Always update the selectedTable's paymentMethod when payment is completed
    setSelectedTable(prev => {
      const updated = prev ? ({ ...prev, paymentMethod: paymentResult?.method }) : prev;
      console.log('Updated selectedTable with payment method:', updated?.paymentMethod);
      return updated;
    });
    
    // Also update the allTables array to persist the payment method
    setAllTables(prev => prev ? prev.map(t => 
      (t && (t._id === selectedTable?._id || t.id === selectedTable?._id)) 
        ? { ...t, paymentMethod: paymentResult?.method } 
        : t
    ) : prev);
    
    // Idempotency: if this table already has a paymentMethod recorded or is marked paid,
    // do NOT increment revenue or create duplicate payment records. Only first completion counts.
    const tableKey = selectedTable?._id || selectedTable?.id || `table-${selectedTable?.tableNumber}`;
    const alreadyPaid = selectedTable && (String(selectedTable?.status || '').toLowerCase() === 'paid' || selectedTable?.paidAt);
    const alreadyHasMethod = selectedTable && selectedTable?.paymentMethod;

    const isDuplicate = alreadyPaid || (alreadyHasMethod && String(selectedTable?.paymentMethod).toLowerCase() === String(paymentResult?.method).toLowerCase());

    // On first-time payment: update daily stats and notify user
    if (!isDuplicate) {
      setDailyStats(prev => ({
        ...prev,
        totalRevenue: prev?.totalRevenue + (Number(paymentResult?.amount) || 0),
        billsGenerated: prev?.billsGenerated + 1
      }));

      setNotifications(prev => [{
        id: `payment-${Date.now()}`,
        type: 'payment_completed',
        message: `Payment of $${(Number(paymentResult?.amount) || 0).toFixed(2)} completed for Table ${selectedTable?.tableNumber}`,
        timestamp: new Date(),
        tableNumber: selectedTable?.tableNumber
      }, ...prev?.slice(0, 4)]);

      // Record payment in per-table history (live)
      const entry = {
        id: paymentResult?.reference || `pay-${Date.now()}`,
        type: paymentResult?.method,
        amount: paymentResult?.amount,
        timestamp: paymentResult?.timestamp || new Date(),
        status: 'completed',
        reference: paymentResult?.reference
      };
      setPaymentHistories(prev => ({
        ...prev,
        [tableKey]: [entry, ...(prev?.[tableKey] || [])].slice(0, 20)
      }));

      // Persist payment to backend when possible
      (async () => {
        try {
          const payload = {
            billId: selectedTable?._id,
            tableNumber: selectedTable?.tableNumber,
            method: paymentResult?.method,
            amount: paymentResult?.amount,
            reference: paymentResult?.reference,
            metadata: paymentResult
          };
          const resp = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (resp.ok) {
            const saved = await resp.json();
            // update history entry id to DB id and keep order
            setPaymentHistories(prev => ({
              ...prev,
              [tableKey]: [{ ...entry, id: saved._id }, ...(prev?.[tableKey] || [])].slice(0, 20)
            }));
            // update selectedTable status if server set bill to paid
            if (saved && saved.billId && selectedTable && selectedTable._id === saved.billId) {
              setSelectedTable(prev => ({ ...prev, status: 'paid', paidAt: saved.timestamp, paymentMethod: paymentResult?.method }));
            }
          } else {
            console.warn('Failed to persist payment to backend', resp.status);
          }
        } catch (err) {
          console.warn('Persist payment failed:', err?.message || err);
        }
      })();
    } else {
      // If table already has a paymentMethod but it's different, treat this as an overwrite request.
      if (alreadyHasMethod && String(selectedTable?.paymentMethod).toLowerCase() !== String(paymentResult?.method).toLowerCase()) {
        // Update local state to reflect new method without changing revenue
        setSelectedTable(prev => prev ? ({ ...prev, paymentMethod: paymentResult?.method }) : prev);
        setAllTables(prev => prev ? prev.map(t => (t && (t._id === selectedTable._id || t.id === selectedTable._id)) ? { ...t, paymentMethod: paymentResult?.method } : t) : prev);

        // Persist the updated paymentMethod to the bill on server (non-payment record)
        (async () => {
          try {
            const billId = selectedTable?._id;
            if (billId && /^[0-9a-fA-F]{24}$/.test(String(billId))) {
              await tryPatchBill(billId, { paymentMethod: paymentResult?.method });
            }
            setNotifications(prev => [{ id: `payment-overwrite-${Date.now()}`, type: 'info', message: `Payment method changed to '${paymentResult?.method}'`, timestamp: new Date() }, ...prev?.slice(0,4)]);
          } catch (err) {
            console.warn('Failed to persist overwritten payment method:', err?.message || err);
            setNotifications(prev => [{ id: `payment-overwrite-fail-${Date.now()}`, type: 'error', message: `Failed to change payment method`, timestamp: new Date() }, ...prev?.slice(0,4)]);
          }
        })();
      } else {
        // Duplicate selection (same method) — add a small non-revenue note for UI history
        if (!alreadyHasMethod) {
          setSelectedTable(prev => prev ? ({ ...prev, paymentMethod: paymentResult?.method }) : prev);
        }
        const note = {
          id: paymentResult?.reference || `note-${Date.now()}`,
          type: paymentResult?.method,
          amount: 0,
          timestamp: paymentResult?.timestamp || new Date(),
          status: 'stored',
          reference: paymentResult?.reference
        };
        setPaymentHistories(prev => ({
          ...prev,
          [tableKey]: [note, ...(prev?.[tableKey] || [])].slice(0, 20)
        }));
        setNotifications(prev => [{ id: `payment-dup-${Date.now()}`, type: 'info', message: `Payment method '${paymentResult?.method}' already recorded for this bill`, timestamp: new Date() }, ...prev?.slice(0,4)]);
      }
    }

    
  };

  const handleExportPDF = async (table) => {
    console.log('Exporting PDF for table:', table?.tableNumber);
    try {
      // Dynamically import html2pdf to keep initial bundle smaller
      const html2pdf = (await import('html2pdf.js'))?.default || (await import('html2pdf.js'));
      // Prefer exporting our printable receipt template if present.
      // Export the inner receipt element when available to avoid copying outer panel layout (which can include full-height styles)
      let el = document.querySelector('#receipt-export-root .receipt-root')
        || document.querySelector('.bill-preview-html .receipt-root')
        || document.querySelector('.bill-preview-html');
      let reactRoot = null;
      let createdContainer = null;
      if (!el) {
        // Create a hidden container to mount the React ReceiptPrint component
        const container = document.createElement('div');
        container.id = 'receipt-export-root';
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);
        createdContainer = container;

        try {
          // Mount the real React component so styles and markup match exactly
          if (!container.__receiptExportRoot) container.__receiptExportRoot = createRoot(container);
          reactRoot = container.__receiptExportRoot;
          reactRoot.render(
            <ReceiptPrint table={table} items={table?.items} business={table?.business} />
          );
          // yield to the browser to allow mounting and styles to apply
          await new Promise(resolve => setTimeout(resolve, 50));
          el = container.querySelector('.receipt-root');
        } catch (mountErr) {
          console.warn('React mount of ReceiptPrint failed, falling back to innerHTML fallback', mountErr);
          // fallback to a minimal placeholder
          try { container.innerHTML = `<div class="receipt-root">Receipt preview</div>`; } catch(e){}
          el = container.querySelector('.receipt-root');
        }
      }

      const opt = {
        margin:       10,
        filename:     `bill-table-${table?.tableNumber}-${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
      };

      // Show a quick notification (optional)
      setNotifications(prev => [{ id: `export-${Date.now()}`, type: 'export', message: `Exporting PDF for Table ${table?.tableNumber}`, timestamp: new Date(), tableNumber: table?.tableNumber }, ...prev?.slice(0,4)]);

      // If we have selectedTable and selectedTable.items, attempt to replace the inner HTML with server-side simple markup
      if (document.querySelector('#receipt-export-root') && table?.items) {
        const r = document.querySelector('#receipt-export-root .receipt-root');
        // Simple markup generation to reflect merged items and totals (keeps it deterministic for html2pdf)
  const merged = mergeItems(table.items || []);

        let html = `<div style="font-family:Inter, Arial, sans-serif; padding:20px; width:210mm; background:white">`;
        html += `<h2 style="text-align:center">${table?.business?.name || 'My Restaurant'}</h2>`;
        html += `<div style="margin-top:8px">Table: ${table?.tableNumber || table?.number || 'N/A'}</div>`;
        html += `<div style="border-top:1px dashed #ddd; margin-top:8px"></div>`;
        merged.forEach(it => {
          html += `<div style="display:flex; justify-content:space-between; margin-bottom:6px"><div style="max-width:65%"><div style="font-weight:600">${it.name}</div>${(it.customizations||it.specialRequest)? `<div style=\"font-size:12px;color:#666\">\"${it.customizations || it.specialRequest}\"</div>` : ''}</div><div style="text-align:right"><div style="font-weight:600">₹${(((it.price||0)*(it.quantity||0))).toFixed(2)}</div><div style="font-size:12px">${it.quantity} × ₹${((it.price||0)).toFixed(2)}</div></div></div>`;
        });
        const subtotal = merged.reduce((s,i)=> s + ((Number(i.price)||0)*(Number(i.quantity)||0)),0);
        const tax = subtotal * 0.08;
        const total = subtotal + tax;
        html += `<div style="border-top:1px dashed #ddd; margin-top:8px"></div>`;
        html += `<div style="text-align:right; margin-top:10px"><div style="display:flex; justify-content:space-between; margin-bottom:4px"><div style="color:#666">Subtotal</div><div>$${subtotal.toFixed(2)}</div></div><div style="display:flex; justify-content:space-between; margin-bottom:8px"><div style="color:#666">Tax (8%)</div><div>$${tax.toFixed(2)}</div></div><div style="display:flex; justify-content:space-between; font-weight:700; font-size:16px"><div>Total</div><div>$${total.toFixed(2)}</div></div></div>`;
        html += `<div style="text-align:center; margin-top:18px; font-size:12px; color:#666">Thank you for dining with us!</div>`;
        html += `</div>`;
        r.innerHTML = html;
        el = r;
      }

  // Clone the element so we can remove UI parts meant only for on-screen use
  const cloneContainer = document.createElement('div');
  cloneContainer.style.position = 'fixed';
  cloneContainer.style.left = '-9999px';
  document.body.appendChild(cloneContainer);
  const elClone = el.cloneNode(true);
  // Remove elements marked with the hide-on-export class
  elClone.querySelectorAll && elClone.querySelectorAll('.hide-on-export')?.forEach(n => n.remove());
  cloneContainer.appendChild(elClone);
  await html2pdf().set(opt).from(elClone).save();
  try {
    // unmount any react root we created earlier for export
    if (cloneContainer && cloneContainer.__receiptExportRoot) {
      try { cloneContainer.__receiptExportRoot.unmount(); } catch (u) {}
    }
    document.body.removeChild(cloneContainer);
  } catch (e) {}

      // Clean up the mounted React tree and container after export
      if (reactRoot) {
        try { reactRoot.unmount(); } catch (u) { /* ignore */ }
      }
      if (createdContainer) {
        try {
          if (createdContainer.__receiptExportRoot) {
            try { createdContainer.__receiptExportRoot.unmount(); } catch (u) {}
          }
          document.body.removeChild(createdContainer);
        } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('Failed to export PDF', err);
      alert('Failed to export PDF. See console for details.');
    }
  };

  // Open printable receipt for the last payment of a table
  const openReceiptForLastPayment = async (table, payment) => {
    if (!table) return;
    try {
      // Mount ReceiptPrint into a hidden container and open print preview
      const containerId = 'receipt-print-preview';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);
      }

      // Render the component into container, reusing existing root if present
      try {
        // store root on the container element to avoid repeated createRoot calls
        if (!container.__receiptReactRoot) {
          container.__receiptReactRoot = createRoot(container);
        }
        container.__receiptReactRoot.render(
          <ReceiptPrint
            table={table}
            items={table?.items}
            business={table?.business}
            billNumber={table?.billNumber}
            date={payment?.timestamp || new Date()}
          />
        );
      } catch (err) {
        try { container.innerHTML = '<div class="receipt-root">Receipt preview</div>'; } catch(e){}
      }

      // Open a new window and write the receipt HTML to it for printing
      const printWindow = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
      if (!printWindow) {
        alert('Popup blocked. Please allow popups to view the receipt.');
        return;
      }
      // Small delay to allow React to mount into container
      await new Promise(r => setTimeout(r, 80));
      const el = container.querySelector('.receipt-root') || container;
      printWindow.document.open();
      printWindow.document.write('<!doctype html><html><head><title>Receipt</title></head><body>');
      printWindow.document.write(el.outerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
    } catch (err) {
      console.warn('Failed to open receipt preview', err);
      alert('Failed to open receipt preview');
    }
  };

  const handleOpenEdit = () => {
    if (!selectedTable) return;
    // Create draft from current selectedTable items
    let draft = (selectedTable?.items || []).map(it => ({ ...it }));
    setEditedDraft(draft);
    latestEditedDraftRef.current = draft;
    // Save a deep copy of the original table so cancel can restore it
    try { originalTableRef.current = JSON.parse(JSON.stringify(selectedTable)); } catch (e) { originalTableRef.current = selectedTable; }
    // Disable auto-persist while user is performing manual edits
    allowAutoPersistRef.current = false;
    setEditMode(true);
  };

  const handleSaveEditedBill = () => {
    const currentDraft = latestEditedDraftRef.current || editedDraft;
    if (!selectedTable || !currentDraft) return;
    
    // Check for validation errors
    if (selectedTable.hasValidationErrors) {
      setNotifications(prev => [{
        id: `validation-error-${Date.now()}`,
        type: 'error',
        message: 'Please fix validation errors before saving',
        timestamp: new Date()
      }, ...prev?.slice(0,4)]);
      return;
    }
    
    // Prevent saving if already refreshing
    if (isRefreshing) {
      setNotifications(prev => [{
        id: `save-blocked-${Date.now()}`,
        type: 'warning',
        message: 'Please wait, bill data is being refreshed...',
        timestamp: new Date()
      }, ...prev?.slice(0,4)]);
      return;
    }
    
    // Show saving notification
    setNotifications(prev => [{
      id: `save-start-${Date.now()}`,
      type: 'info',
      message: 'Saving bill changes...',
      timestamp: new Date()
    }, ...prev?.slice(0,4)]);

    // Only update price for each draft item; keep other fields same
    const newItems = (currentDraft || []).map(it => ({
      ...it,
      price: Number(it.price || it.pricePerUnit || 0)
    }));

    // Optimistically update UI
    setSelectedTable(prev => {
      if (!prev) return prev;
      const subtotal = newItems.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 0)), 0);
      return { ...prev, items: newItems, totalAmount: subtotal };
    });

    // Attempt to persist to backend
    const payload = { items: newItems, editedBy: (window?.APP_USER_NAME || 'web-user') };
    (async () => {
      try {
        const billId = selectedTable?._id;
        // Only attempt server persistence if we have a real Mongo ObjectId
          if (billId && /^[0-9a-fA-F]{24}$/.test(String(billId))) {
            const respData = await tryPatchBill(billId, payload);
            if (respData) setSelectedTable(prev => ({ ...prev, ...respData }));
          } else {
            // No server id -> skip persistence silently (local/dev data)
          }
      } catch (err) {
        console.error('Failed to persist edited bill to backend', err);
        setNotifications(prev => [{ id: `edit-fail-${Date.now()}`, type: 'error', message: 'Failed to save edited bill to server', timestamp: new Date() }, ...prev?.slice(0,4)]);
      } finally {
        setEditedDraft(null);
        latestEditedDraftRef.current = null;
        // Re-enable auto-persist after explicit save
        allowAutoPersistRef.current = true;
        originalTableRef.current = null;
        setEditMode(false);
      }
    })();
  };

  // Helper: try PATCH across several likely base URLs to be resilient when backend runs on different port during dev
  const fetchBillData = async (billId) => {
    const candidates = [
      `/api/bills/${billId}`,
      `http://localhost:5003/api/bills/${billId}`,
      `http://localhost:5002/api/bills/${billId}`,
      `http://localhost:5001/api/bills/${billId}`
    ];

    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        if (err.name === 'AbortError') continue;
        console.warn(`Failed to fetch from ${url}:`, err);
      }
    }
    throw new Error('Failed to fetch bill data from all endpoints');
  };

  const tryPatchBill = async (billId, payload) => {
    const candidates = [
      `/api/bills/${billId}`,
      `http://localhost:5003/api/bills/${billId}`,
      `http://localhost:5002/api/bills/${billId}`,
      `http://localhost:5001/api/bills/${billId}`
    ];
    setDebugSaveInfo({ lastAttempt: null, attempts: [] });
    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        // Record attempt start
        const attemptData = {
          url,
          timestamp: new Date(),
          payload
        };

        try {
          const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeout);

          // Add response data to attempt
          attemptData.status = res.status;
          if (res.ok) {
            const data = await res.json();
            attemptData.response = data;
            
            // Add successful attempt to history
            if (isDevelopment) {
              setSaveAttempts(prev => [attemptData, ...prev].slice(0, 20)); // Keep last 20 attempts
            }
            
            return data;
          }
          attemptData.error = `HTTP ${res.status}: ${res.statusText}`;
        } catch (err) {
          attemptData.error = err.name === 'AbortError' ? 'Request timeout' : err.message;
        } finally {
          // Add failed attempt to history in development
          if (isDevelopment) {
            setSaveAttempts(prev => [attemptData, ...prev].slice(0, 20));
          }
        }
      } catch (err) {
        setDebugSaveInfo(prev => ({ lastAttempt: { url, error: err?.message || String(err) }, attempts: [...(prev?.attempts||[]), { url, error: err?.message || String(err) }] }));
        // try next candidate
        // network errors or abort will be caught here
      }
    }
    // all attempts failed
    throw new Error('All backend endpoints failed');
  };
  const handleCancelEdit = () => {
    // Restore original table snapshot when cancelling edits
    if (originalTableRef.current) {
      setSelectedTable(originalTableRef.current);
    }
    // Clear any pending auto-persist timer
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    setEditedDraft(null);
    latestEditedDraftRef.current = null;
    originalTableRef.current = null;
    // Re-enable auto-persist
    allowAutoPersistRef.current = true;
    setEditMode(false);
  };

  // Expose a test hook for headless tests (only active when a test flag is enabled)
  try {
    if (typeof window !== 'undefined' && window.__TEST_MODE__) {
      window.__triggerExportForTest = async (tbl) => {
        const t = tbl || selectedTable;
        await handleExportPDF(t);
      };
    }
  } catch (e) {
    // ignore in non-browser environments
  }

  const handleViewBill = (bill) => {
    // Convert a billing-history bill object into a selectedTable-like shape
    if (!bill) return;

    // Try to find an existing table in active list by id or tableNumber
    const match = (allTables || []).find(t => {
      if (!t) return false;
      if (bill?.id && (t._id === bill.id || t.id === bill.id)) return true;
      if (bill?.tableNumber && t.tableNumber === bill.tableNumber) return true;
      return false;
    });

    if (match) {
      // Use existing table object
      setSelectedTable(match);
    } else {
      // View-only: create an in-memory table-like object and select it, but do NOT insert into allTables
      const tempId = bill?.id || `history-${bill?.billNumber || bill?.tableNumber}-${Date.now()}`;
      const tempTable = {
        _id: tempId,
        id: tempId,
        tableNumber: bill?.tableNumber,
        billNumber: bill?.billNumber,
        items: Array.isArray(bill?.items) ? bill.items : bill?.items || [],
        totalAmount: bill?.amount || 0,
        guestCount: bill?.guestCount || 0,
        status: bill?.status || 'history',
        // mark it's a read-only view from history
        _fromHistory: true
      };

      setSelectedTable(tempTable);
    }

    // Switch to billing view to show the preview and actions
    setActiveView('billing');
  };

  const handleExportData = (exportData) => {
    console.log('Exporting billing data:', exportData);
    try {
      const rows = [];

      // metadata row
      const exportedOn = new Date();
      rows.push([`Exported on`, exportedOn.toLocaleString()]);

      // include filters if present
      if (exportData?.filters) {
        const f = exportData.filters;
        rows.push(['Filters', `search=${f.searchTerm || ''}`, `start=${f.dateRange?.startDate || ''}`, `end=${f.dateRange?.endDate || ''}`, `status=${f.statusFilter || ''}`]);
      }

      // blank row
      rows.push([]);

  // header (excluding Status and Guest Count as requested)
  rows.push(['Bill No', 'Table No', 'Date & Time', 'Amount', 'Tax', 'Tip', 'Payment Method']);

      const list = Array.isArray(exportData?.data) ? exportData.data : [];
      list.forEach(b => {
        const billDate = b?.date ? (new Date(b.date)).toLocaleString() : '';
        rows.push([
          b?.billNumber || b?.id || '',
          b?.tableNumber || '',
          billDate,
          (b?.amount != null) ? b.amount : '',
          (b?.tax != null) ? b.tax : '',
          (b?.tip != null) ? b.tip : '',
          b?.paymentMethod || ''
        ]);
      });

      // convert to CSV (with BOM for Excel)
      const csvContent = rows.map(r => r.map(c => `"${String(c ?? '')?.replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const csvWithBOM = '\ufeff' + csvContent;
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const pad = (n) => String(n).padStart(2, '0');
      const fnDate = `${exportedOn.getFullYear()}${pad(exportedOn.getMonth()+1)}${pad(exportedOn.getDate())}_${pad(exportedOn.getHours())}${pad(exportedOn.getMinutes())}`;
      a.download = `billing-history-${fnDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      // fallback: create an empty downloadable file so UI doesn't break
      const blob = new Blob([''], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-history-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })?.format(date);
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev?.filter(notif => notif?.id !== notificationId));
  };

  return (
  <div className="min-h-screen bg-background">
      <Header userRole="owner" onToggleSidebar={() => {}} />
  <div className="pt-16">
        {/* Top Stats Bar */}
        <div className="bg-card border-b border-border p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatCurrency(dailyStats?.totalRevenue)}</div>
                <div className="text-sm text-muted-foreground">Today's Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{dailyStats?.billsGenerated}</div>
                <div className="text-sm text-muted-foreground">Bills Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{dailyStats?.pendingPayments}</div>
                <div className="text-sm text-muted-foreground">Pending Payments</div>
              </div>
              {/* Average Ticket removed as per user request */}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant={activeView === 'billing' ? 'default' : 'ghost'}
                onClick={() => setActiveView('billing')}
                className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
                data-active={activeView === 'billing'}
              >
                <Icon name="Receipt" size={16} className="mr-2" />
                Active Billing
              </Button>
              <Button
                variant={activeView === 'history' ? 'default' : 'ghost'}
                onClick={() => setActiveView('history')}
                className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
                data-active={activeView === 'history'}
              >
                <Icon name="History" size={16} className="mr-2" />
                Billing History
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications bar removed as per user request */}

    {/* Main Content */}
    {/* Increase available height and ensure the panels align by using a slightly smaller subtraction
      so the content area is taller. Also keep full height for the grid so children can flex. */}
  <div className="max-w-7xl mx-auto h-[calc(100vh-200px)] px-2 sm:px-4">
          {activeView === 'billing' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {/* Active Tables Panel */}
              {/* Make each column a flex column so internal panels can stretch to equal heights */}
              <div className="md:col-span-1 flex flex-col min-h-[300px]">
                <ActiveTablesPanel
                  tables={allTables}
                  onSelectTable={handleSelectTable}
                  selectedTableKey={selectedTable?._id || selectedTable?.id || (selectedTable ? `table-${selectedTable?.tableNumber}` : null)}
                />
              </div>

              {/* Bill Preview Panel */}
              <div className="md:col-span-1 flex flex-col min-h-[300px]">
                <BillPreviewPanel
                  selectedTable={selectedTable}
                  onPrintBill={handlePrintBill}
                  onEmailReceipt={handleEmailReceipt}
                  onProcessPayment={handleProcessPayment}
                  onViewReceipt={(tbl, payment) => openReceiptForLastPayment(tbl, payment)}
                  editMode={editMode}
                  draftItems={editedDraft}
                  savingStatus={savingStatus}
                  debugSaveInfo={debugSaveInfo}
                  paymentHistory={paymentHistories[selectedTable?._id || selectedTable?.id || `table-${selectedTable?.tableNumber}`] || []}
                    onUpdateDraftItem={(idx, next) => {
                    // Build a fresh draft synchronously to avoid stale-state issues
                    setEditedDraft(prev => {
                      const base = (prev && prev.length) ? prev.map(it => ({ ...it })) : (selectedTable?.items || []).map(it => ({ ...it }));
                      // ensure index exists
                      if (typeof base[idx] === 'undefined') base[idx] = { ...(selectedTable?.items?.[idx] || {}) };
                      base[idx] = { ...base[idx], ...next };
                      const newDraft = base;

                      // Check if any items have validation errors
                      const hasErrors = newDraft.some(item => item.error);

                      // Immediately update visible selectedTable totals using newDraft
                      setSelectedTable(prevTable => {
                        if (!prevTable) return prevTable;
                        const newItems = newDraft.map(it => ({ ...it }));
                        const subtotal = newItems.reduce((s, i) => s + ((Number(i.price) || 0) * (i.quantity || 0)), 0);
                        const updated = { 
                          ...prevTable, 
                          items: newItems, 
                          totalAmount: subtotal,
                          hasValidationErrors: hasErrors 
                        };

                        // Also update the list of all tables so active list shows live totals
                        setAllTables(prev => prev?.map(tbl => {
                          const matches = (tbl._id && prevTable._id) ? tbl._id === prevTable._id : tbl.id === prevTable.id;
                          return matches ? { ...tbl, items: newItems, totalAmount: subtotal } : tbl;
                        }));

                        return updated;
                      });

                      // Debounce persist to backend using the newDraft captured in this closure
                      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
                      // Only auto-persist if allowed (not in manual edit mode). Manual edits should be saved explicitly with Save.
                      if (allowAutoPersistRef.current) {
                        persistTimerRef.current = setTimeout(async () => {
                        try {
                          setSavingStatus('saving');
                          const billId = selectedTable?._id;
                          // only persist if we have a real Mongo id
                          if (billId && /^[0-9a-fA-F]{24}$/.test(String(billId))) {
                            const payload = { items: newDraft, editedBy: (window?.APP_USER_NAME || 'web-user') };
                            try {
                              const respData = await tryPatchBill(billId, payload);
                              if (respData) {
                                // Update UI with new data
                                setSelectedTable(prev => ({ ...prev, ...respData }));
                                
                                // Update the table in allTables list to keep ActiveTablesPanel in sync
                                setAllTables(prev => prev.map(table => 
                                  table._id === billId ? { ...table, ...respData } : table
                                ));
                                
                                setSavingStatus('saved');
                                
                                // Show success notification
                                setNotifications(prev => [{
                                  id: `save-success-${Date.now()}`,
                                  type: 'success',
                                  message: 'Bill updated successfully',
                                  timestamp: new Date()
                                }, ...prev?.slice(0,4)]);

                                // Start refresh process
                                setIsRefreshing(true);
                                setSavingStatus('refreshing');
                                
                                try {
                                  // Show refreshing notification
                                  setNotifications(prev => [{
                                    id: `refresh-start-${Date.now()}`,
                                    type: 'info',
                                    message: 'Refreshing bill data...',
                                    timestamp: new Date()
                                  }, ...prev?.slice(0,4)]);

                                  const freshData = await fetchBillData(billId);
                                  
                                  // Validate fresh data
                                  if (!freshData || !Array.isArray(freshData.items)) {
                                    throw new Error('Invalid data received from server');
                                  }
                                  
                                  // Update selected table with fresh data
                                  setSelectedTable(prev => ({
                                    ...prev,
                                    ...freshData,
                                    items: freshData.items.map(item => ({
                                      ...item,
                                      price: Number(item.price) || 0,
                                      quantity: Number(item.quantity) || 0
                                    }))
                                  }));

                                  // Clear any editing state
                                  setEditMode(false);
                                  setEditedDraft(null);

                                  // Update any dependent UI state
                                  const subtotal = freshData.items.reduce((sum, item) => 
                                    sum + (Number(item.price) * Number(item.quantity)), 0);
                                  
                                  // Update daily stats if needed
                                  setDailyStats(prev => ({
                                    ...prev,
                                    pendingPayments: freshData.status === 'pending' ? prev.pendingPayments : prev.pendingPayments - 1
                                  }));

                                  // Show success notification
                                  setNotifications(prev => [{
                                    id: `refresh-success-${Date.now()}`,
                                    type: 'success',
                                    message: 'Bill data refreshed successfully',
                                    timestamp: new Date()
                                  }, ...prev?.slice(0,4)]);

                                } catch (err) {
                                  console.error('Failed to refresh bill data:', err);
                                  setNotifications(prev => [{
                                    id: `refresh-error-${Date.now()}`,
                                    type: 'error',
                                    message: `Failed to refresh bill data: ${err.message}. Try reloading the page.`,
                                    timestamp: new Date()
                                  }, ...prev?.slice(0,4)]);
                                  
                                  // Revert to edit mode if refresh fails
                                  setEditMode(true);
                                  setEditedDraft(prev => prev);
                                } finally {
                                  setIsRefreshing(false);
                                  setSavingStatus('idle');
                                }
                              }
                              setTimeout(() => setSavingStatus('idle'), 1200);
                            } catch (err) {
                              console.error('Autosave (tryPatchBill) failed:', err?.message || err);
                              setSavingStatus('error');
                              setNotifications(prev => [{ id: `autosave-fail-${Date.now()}`, type: 'error', message: `Autosave failed: ${err?.message || 'network error'}`, timestamp: new Date() }, ...prev?.slice(0,4)]);
                              setTimeout(() => setSavingStatus('idle'), 2000);
                            }
                          } else {
                            // No server persistence for local/sample bills
                            setSavingStatus('idle');
                          }
                        } catch (err) {
                          console.error('Autosave unexpected error:', err);
                          setSavingStatus('error');
                          setNotifications(prev => [{ id: `autosave-fail-${Date.now()}`, type: 'error', message: 'Autosave failed', timestamp: new Date() }, ...prev?.slice(0,4)]);
                          setTimeout(() => setSavingStatus('idle'), 2000);
                        }
                        }, 800);
                      } else {
                        // When editing manually, do not auto-save; keep status idle
                        setSavingStatus('idle');
                      }

                      return newDraft;
                    });
                  }}
                />
              </div>

              {/* Billing Actions Panel */}
              <div className="md:col-span-1 flex flex-col min-h-[300px]">
                <BillingActionsPanel
                  selectedTable={selectedTable}
                  onPrintBill={handlePrintBill}
                  onEmailReceipt={handleEmailReceipt}
                  onProcessPayment={handleProcessPayment}
                  onExportPDF={handleExportPDF}
                  onOpenEdit={handleOpenEdit}
                  editMode={editMode}
                  onSaveEdit={handleSaveEditedBill}
                  onCancelEdit={handleCancelEdit}
                  onSetCustomerInfo={handleSetCustomerInfo}
                  paymentHistory={paymentHistories[selectedTable?._id || selectedTable?.id || `table-${selectedTable?.tableNumber}`] || []}
                  onVoidPayment={async (paymentId) => {
                    const tableKey = selectedTable?._id || selectedTable?.id || `table-${selectedTable?.tableNumber}`;
                    try {
                      const resp = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/void`, { method: 'POST' });
                      if (resp.ok) {
                        const updated = await resp.json();
                        setPaymentHistories(prev => ({
                          ...prev,
                          [tableKey]: (prev?.[tableKey] || []).map(p => p.id === paymentId ? { ...p, status: updated.status, voidedAt: updated.voidedAt } : p)
                        }));
                      } else {
                        console.warn('Failed to void payment on server', resp.status);
                      }
                    } catch (err) {
                      console.warn('Void request failed', err?.message || err);
                    }
                  }}
                  onReprintReceipt={(payment) => openReceiptForLastPayment(selectedTable, payment)}
                />
              </div>
            </div>
          ) : (
            <div className="h-full">
              <BillingHistoryPanel
                onViewBill={handleViewBill}
                onExportData={handleExportData}
                onExportPDF={handleExportPDF}
              />
            </div>
          )}
        </div>
      </div>
      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal?.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, data: null })}
        paymentData={paymentModal?.data}
        onPaymentComplete={handlePaymentComplete}
      />
      
      {/* Dev-only attempt history modal */}
      {isDevelopment && (
        <AttemptHistoryModal
          isOpen={showAttemptHistory}
          onClose={() => setShowAttemptHistory(false)}
          attempts={saveAttempts}
        />
      )}
    </div>
  );
};

export default BillingPaymentManagement;