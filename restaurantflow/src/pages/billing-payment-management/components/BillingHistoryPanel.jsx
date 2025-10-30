import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import BillPreviewPanel from './BillPreviewPanel';
import ReceiptPrint from './ReceiptPrint';
import PdfReceipt from './PdfReceipt';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import DatePicker from '../../../components/ui/DatePicker';
import Select from '../../../components/ui/Select';
import jsPDF from 'jspdf';

const BillingHistoryPanel = ({ onViewBill, onExportData, onExportPDF }) => {
  const [billingHistory, setBillingHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportBtnActive, setReportBtnActive] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });
  const [reportType, setReportType] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'table'
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let abort = false;
    const load = async () => {
      try {
        // Fetch bills and payments so we can include payments-only records in history
        const [resBills, resPayments] = await Promise.all([fetch('/api/bills'), fetch('/api/payments')]);
        if (!resBills.ok) throw new Error(`Failed to load bills (${resBills.status})`);
        if (!resPayments.ok) {
          // payments may be optional; proceed with empty array
        }
        const data = await resBills.json();
        let payments = [];
        try { payments = resPayments.ok ? await resPayments.json() : []; } catch (e) { payments = []; }
        if (abort) return;
        // Build a set of bill ids returned by the bills endpoint
        const billIds = new Set((Array.isArray(data) ? data : []).map(b => b?._id || b?.id).filter(Boolean));

        // Convert payments that don't have a matching bill into derived bill-like records
        const derivedFromPayments = (Array.isArray(payments) ? payments : []).reduce((acc, p) => {
          if (!p) return acc;
          const billId = p.billId || p.bill?._id || p.bill?.id;
          // if there is a matching bill returned by /api/bills, skip deriving
          if (billId && billIds.has(billId)) return acc;
          // create a minimal derived bill object from payment
          const d = p.timestamp ? new Date(p.timestamp) : new Date(p.createdAt || p.date || Date.now());
          const derived = {
            _id: billId || `payment-derived-${p._id || p.id || Date.now()}`,
            billNumber: p.reference || `PAY-${(d.getTime().toString()).slice(-6)}`,
            tableNumber: p.tableNumber || p.table || 0,
            createdAt: d,
            totalAmount: Number(p.amount) || 0,
            paymentMethod: p.method || p.type || 'cash',
            status: 'paid',
            waiterName: '',
            guestCount: 0,
            items: []
          };
          acc.push(derived);
          return acc;
        }, []);

        // Combine actual bills and derived payments so history includes everything
        const combined = [...(Array.isArray(data) ? data : []), ...derivedFromPayments];

        // Map backend Bill docs into UI-friendly shape
  const mapped = (Array.isArray(combined) ? combined : []).map((b) => {
          const d = b?.createdAt ? new Date(b.createdAt) : new Date();
          const tableNumber = b?.tableNumber ?? 0;
          const amount = typeof b?.totalAmount === 'number' ? b.totalAmount : 0;
          // Derive a display bill number if not present (format: RF-<table>-<last6 of timestamp>)
          const derivedBillNo = `RF-${tableNumber}-${(d.getTime().toString()).slice(-6)}`;
          return {
            id: b?._id || derivedBillNo,
            billNumber: b?.billNumber || derivedBillNo,
            tableNumber,
            date: d,
            amount,
            // If backend lacks payment method, default to 'cash' for display or leave undefined
            paymentMethod: b?.paymentMethod || 'cash',
            status: b?.status || 'pending',
            waiterName: b?.waiterName || '',
            guestCount: b?.guestCount, // may be undefined; UI will hide when absent
            items: b?.items || [],
            // Show simple derived tax (8%) if actual not provided; no tip by default
            tax: typeof b?.tax === 'number' ? b.tax : Number((amount * 0.08).toFixed(2)),
            tip: typeof b?.tip === 'number' ? b.tip : 0,
          };
        });
        setBillingHistory(mapped);
      } catch (e) {
        console.error('Failed to fetch bills:', e);
        setBillingHistory([]);
      }
    };
  load();
  // Polling removed to prevent page from resetting automatically

  // Listen for immediate payment-created events from the app
  const onPaymentCreated = (e) => {
      try {
        const p = e?.detail;
        if (!p) return;
        const d = p.timestamp ? new Date(p.timestamp) : new Date(p.createdAt || p.date || Date.now());
        const derived = {
          id: p.billId || p._id || `payment-${p.id || Date.now()}`,
          billNumber: p.reference || `PAY-${(d.getTime().toString()).slice(-6)}`,
          tableNumber: p.tableNumber || p.table || 0,
          date: d,
          amount: Number(p.amount) || 0,
          paymentMethod: p.method || p.type || 'cash',
          status: 'paid',
          waiterName: '',
          guestCount: 0,
          items: []
        };
        setBillingHistory(prev => {
          // Avoid duplicates by billNumber or id
          if ((prev || []).some(b => b?.billNumber === derived.billNumber || b?.id === derived.id)) return prev;
          return [derived, ...(prev || [])];
        });
      } catch (err) {}
    };
    window.addEventListener('rf:payment-created', onPaymentCreated);
    return () => { abort = true; };
    // Cleanup
    return () => { clearInterval(interval); window.removeEventListener('rf:payment-created', onPaymentCreated); };
  }, []);

  useEffect(() => {
    let filtered = [...billingHistory];

    // Apply search filter (bill number only)
    if (searchTerm) {
      const needle = String(searchTerm || '').toLowerCase();
      filtered = filtered?.filter(bill => {
        const billNo = bill?.billNumber == null ? '' : String(bill?.billNumber);
        return billNo.toLowerCase().includes(needle);
      });
    }

    // Apply date range filter
    if (dateRange?.startDate) {
      filtered = filtered?.filter(bill => bill?.date >= new Date(dateRange.startDate));
    }
    if (dateRange?.endDate) {
      filtered = filtered?.filter(bill => bill?.date <= new Date(dateRange.endDate));
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered?.filter(bill => bill?.status === statusFilter);
    }

    // Apply sorting
    filtered?.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'amount':
          aValue = a?.amount;
          bValue = b?.amount;
          break;
        case 'table':
          aValue = a?.tableNumber;
          bValue = b?.tableNumber;
          break;
        default:
          aValue = a?.date;
          bValue = b?.date;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredHistory(filtered);
    setCurrentPage(1);
  }, [billingHistory, searchTerm, dateRange, statusFilter, sortBy, sortOrder]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })?.format(date);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-success bg-success/10 border-success/20';
      case 'pending':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'voided':
        return 'text-error bg-error/10 border-error/20';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return 'Banknote';
      case 'card':
        return 'CreditCard';
      case 'split':
        return 'Scissors';
      default:
        return 'DollarSign';
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleExportFiltered = () => {
    const exportData = {
      data: filteredHistory,
      filters: {
        searchTerm,
        dateRange,
        statusFilter,
        totalRecords: filteredHistory?.length
      }
    };
    onExportData && onExportData(exportData);
  };

  // Handler for Print/Export PDF Report
  const handlePrintOrExportReport = () => {
    setShowReportModal(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredHistory?.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredHistory?.slice(startIndex, endIndex);

  // Summary statistics
  const totalAmount = filteredHistory?.reduce((sum, bill) => sum + bill?.amount, 0);
  const paidAmount = filteredHistory?.filter(bill => bill?.status === 'paid')?.reduce((sum, bill) => sum + bill?.amount, 0);
  const pendingAmount = filteredHistory?.filter(bill => bill?.status === 'pending')?.reduce((sum, bill) => sum + bill?.amount, 0);

  const [expandedBillId, setExpandedBillId] = useState(null);
  const [modalBill, setModalBill] = useState(null);

  const handlePrintModalReceipt = () => {
    try {
      const el = document.getElementById('modal-receipt-root');
      if (!el) return;
      const markup = el.innerHTML;
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) return;
      w.document.write('<!doctype html><html><head><title>Print Receipt</title>');
      // basic styles to keep print similar
      w.document.write('<style>body{font-family:monospace,Inter,Arial,sans-serif;padding:20px;color:#111} .pdf-receipt-root{width:720px;max-width:100%}</style>');
      w.document.write('</head><body>');
      w.document.write(markup);
      w.document.write('</body></html>');
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 300);
    } catch (e) {
      console.error('Print failed', e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
  {/* Header */}
  <div className="p-6 border-b border-border relative z-20 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Billing History</h2>
          <Button
            variant="outline"
            onClick={handleExportFiltered}
            iconName="Download"
            iconPosition="left"
          >
            Export Data
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary font-medium">Total Revenue</div>
                <div className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</div>
              </div>
              <Icon name="TrendingUp" size={24} className="text-primary" />
            </div>
          </div>
          {/* modal removed */}
          
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-success font-medium">Paid Bills</div>
                <div className="text-xl font-bold text-success">{formatCurrency(paidAmount)}</div>
              </div>
              <Icon name="CheckCircle" size={24} className="text-success" />
            </div>
          </div>
          
          <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-warning font-medium">Pending</div>
                <div className="text-xl font-bold text-warning">{formatCurrency(pendingAmount)}</div>
              </div>
              <Icon name="Clock" size={24} className="text-warning" />
            </div>
          </div>
        </div>

  {/* Filters */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end relative z-20">
    <Input
      label="Search"
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e?.target?.value)}
      placeholder="Bill number..."
    />
    <DatePicker
      label="Start Date"
      value={dateRange?.startDate}
      onChange={val => setDateRange(prev => ({ ...prev, startDate: val }))}
    />
    <DatePicker
      label="End Date"
      value={dateRange?.endDate}
      onChange={val => setDateRange(prev => ({ ...prev, endDate: val }))}
    />
    <div className="flex justify-end md:col-span-1 lg:col-span-1">
    <Button
      variant="outline"
      onClick={handlePrintOrExportReport}
      iconName="Printer"
      iconPosition="left"
    >
      Print Report / Export PDF
    </Button>
    </div>
  </div>
      </div>
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-auto h-full relative">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-card border-b border-border shadow-sm pointer-events-none">
              <tr>
                <th className="text-left p-4 font-medium text-foreground sticky top-0 z-10 bg-card pointer-events-auto">
                  <button
                    onClick={() => handleSort('billNumber')}
                    className="flex items-center space-x-1 hover:text-primary transition-colors"
                  >
                    <span>Bill #</span>
                    <Icon name="ArrowUpDown" size={14} />
                  </button>
                </th>
                <th className="text-left p-4 font-medium text-foreground sticky top-0 z-10 bg-card pointer-events-auto">
                  <button
                    onClick={() => handleSort('table')}
                    className="flex items-center space-x-1 hover:text-primary transition-colors"
                  >
                    <span>Table</span>
                    <Icon name="ArrowUpDown" size={14} />
                  </button>
                </th>
                <th className="text-left p-4 font-medium text-foreground sticky top-0 z-10 bg-card pointer-events-auto">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center space-x-1 hover:text-primary transition-colors"
                  >
                    <span>Date & Time</span>
                    <Icon name="ArrowUpDown" size={14} />
                  </button>
                </th>
                <th className="text-left p-4 font-medium text-foreground sticky top-0 z-10 bg-card pointer-events-auto">
                  <button
                    onClick={() => handleSort('amount')}
                    className="flex items-center space-x-1 hover:text-primary transition-colors"
                  >
                    <span>Amount</span>
                    <Icon name="ArrowUpDown" size={14} />
                  </button>
                </th>
                <th className="text-left p-4 font-medium text-foreground sticky top-0 z-10 bg-card pointer-events-auto">Payment</th>
                {/* Status column removed per request */}
                {/* Waiter column removed per request */}
                <th className="text-left p-4 font-medium text-foreground sticky top-0 z-10 bg-card pointer-events-auto">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems?.map((bill) => (
                <React.Fragment key={bill?.id}>
                  <tr className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-sm text-foreground">{bill?.billNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{bill?.tableNumber}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">Table {bill?.tableNumber}</div>
                          <div className="text-xs text-muted-foreground">{bill?.guestCount} guests</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground">{formatDate(bill?.date)}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(bill?.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        Tax: {formatCurrency(bill?.tax)} • Tip: {formatCurrency(bill?.tip)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Icon name={getPaymentMethodIcon(bill?.paymentMethod)} size={16} className="text-muted-foreground" />
                        <span className="text-sm text-foreground capitalize">{
                          (() => {
                            const method = (bill?.paymentMethod || '').toLowerCase().trim();
                            if (method === 'cash') return 'Cash';
                            if (method === 'card') return 'Card';
                            if (method === 'upi') return 'UPI';
                            if (method === 'split') return 'Split';
                            if (method && typeof method === 'string' && method !== '') return method.charAt(0).toUpperCase() + method.slice(1);
                            return 'Cash'; // Default fallback
                          })()
                        }</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setModalBill(bill); setExpandedBillId(bill?.id); }}
                        >
                          <Icon name="Eye" size={14} className="mr-1" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal popup for viewing a bill */}
      {modalBill && (
        <Modal
          title={`Bill ${modalBill?.billNumber || ''}`}
          onClose={() => { setModalBill(null); setExpandedBillId(null); }}
          actions={<button className="text-sm px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700" onClick={handlePrintModalReceipt}>Print</button>}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {/* Centered card: white background, subtle shadow, rounded corners, padding */}
            <div style={{ background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.08)', maxWidth: '760px', width: '100%', boxSizing: 'border-box' }}>
              <div id="modal-receipt-root">
                <PdfReceipt viewWidth="720px" table={{ business: modalBill?.business, tableNumber: modalBill?.tableNumber, number: modalBill?.tableNumber }} items={modalBill?.items || []} business={modalBill?.business} billNumber={modalBill?.billNumber} />
              </div>
            </div>
          </div>
        </Modal>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredHistory?.length)} of {filteredHistory?.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <Icon name="ChevronLeft" size={16} />
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <Icon name="ChevronRight" size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Empty State */}
      {filteredHistory?.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
              <Icon name="Receipt" size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Bills Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || dateRange?.startDate || statusFilter !== 'all' ?'No bills match your current filters' :'No billing history available'
              }
            </p>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <Modal title="Generate Report" onClose={() => setShowReportModal(false)}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generate Report</h3>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="Start Date"
                value={reportDateRange.start}
                onChange={val => setReportDateRange(prev => ({ ...prev, start: val }))}
              />
              <DatePicker
                label="End Date"
                value={reportDateRange.end}
                onChange={val => setReportDateRange(prev => ({ ...prev, end: val }))}
              />
            </div>
            <div className="mb-4">
              <Select
                label="Report Type"
                value={reportType}
                options={[{ label: 'Export PDF', value: 'pdf' }, { label: 'Print', value: 'print' }]}
                onChange={val => setReportType(val)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    setShowReportModal(false);
                    // Filter bills by selected date range
                    const start = reportDateRange.start ? new Date(reportDateRange.start) : null;
                    const end = reportDateRange.end ? new Date(reportDateRange.end) : null;
                    const filtered = filteredHistory.filter(bill => {
                      const billDate = new Date(bill.date.getTime() - bill.date.getTimezoneOffset() * 60000);
                      let inRange = true;
                      if (start) inRange = inRange && (billDate >= start);
                      if (end) inRange = inRange && (billDate <= end);
                      return inRange;
                    });
                    // Group bills by local date
                    const billsByDate = {};
                    filtered.forEach(bill => {
                      if (!bill.date) return;
                      const localDate = new Date(bill.date.getTime() - bill.date.getTimezoneOffset() * 60000);
                      const dateStr = localDate.toISOString().slice(0, 10);
                      if (!billsByDate[dateStr]) billsByDate[dateStr] = [];
                      billsByDate[dateStr].push(bill);
                    });
                    const rows = Object.entries(billsByDate).map(([date, bills]) => {
                      const numericBills = bills.filter(b => /^\d+$/.test(b.billNumber));
                      let fromBill, toBill;
                      if (numericBills.length > 0) {
                        const nums = numericBills.map(b => parseInt(b.billNumber, 10));
                        fromBill = Math.min(...nums).toString();
                        toBill = Math.max(...nums).toString();
                      } else {
                        const sorted = bills.map(b => b.billNumber).sort();
                        fromBill = sorted[0];
                        toBill = sorted[sorted.length - 1];
                      }
                      const totalGST = bills.reduce((sum, bill) => sum + (bill.tax || 0), 0);
                      return { date, fromBill, toBill, totalGST };
                    });
                    if (reportType === 'pdf') {
                      if (typeof jsPDF === 'undefined') {
                        alert('PDF export is not available. jsPDF library is missing.');
                        return;
                      }
                      const doc = new jsPDF();
                      doc.setFontSize(16);
                      doc.text('Billing GST Report', 10, 10);
                      doc.setFontSize(12);
                      doc.text(`Date Range: ${reportDateRange.start || '-'} to ${reportDateRange.end || '-'}`, 10, 20);
                      let y = 30;
                      doc.text('Date', 10, y);
                      doc.text('Bill No (From - To)', 50, y);
                      doc.text('Total GST', 130, y);
                      y += 8;
                      rows.forEach(row => {
                        doc.text(row.date, 10, y);
                        doc.text(`${row.fromBill} - ${row.toBill}`, 50, y);
                        doc.text(`$${row.totalGST.toFixed(2)}`, 130, y);
                        y += 8;
                        if (y > 270) {
                          doc.addPage();
                          y = 20;
                        }
                      });
                      doc.save('billing_gst_report.pdf');
                    } else {
                      // Print logic
                      let printWindow = window.open('', '_blank', 'noopener,noreferrer');
                      if (!printWindow) return;
                      printWindow.document.write('<!doctype html><html><head><title>Print Billing GST Report</title>');
                      printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#f5f5f5;}</style>');
                      printWindow.document.write('</head><body>');
                      printWindow.document.write(`<h2>Billing GST Report</h2>`);
                      printWindow.document.write(`<div>Date Range: ${reportDateRange.start || '-'} to ${reportDateRange.end || '-'}</div>`);
                      printWindow.document.write('<table><thead><tr><th>Date</th><th>Bill No (From - To)</th><th>Total GST</th></tr></thead><tbody>');
                      rows.forEach(row => {
                        printWindow.document.write(`<tr><td>${row.date}</td><td>${row.fromBill} - ${row.toBill}</td><td>$${row.totalGST.toFixed(2)}</td></tr>`);
                      });
                      printWindow.document.write('</tbody></table>');
                      printWindow.document.write('</body></html>');
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
                    }
                  } catch (err) {
                    console.error('Report generation error:', err);
                    alert('An error occurred while generating the report. Please check the console for details.');
                  }
                }}
              >Generate</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BillingHistoryPanel;