import React, { useEffect, useState } from 'react';
import { mergeItems } from '../../../utils/mergeBill';
import { apiUrl } from '../../../utils/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount).replace('₹', '').trim();
}

const ReceiptPrint = ({ table = {}, items = [], business = { name: 'MY RESTAURANT', address: '' }, billNumber, date, taxRate = 0.05 }) => {
  // Merge items by base name; sum full/half counts and amounts
  const displayGroups = {};
  (items || []).forEach((item) => {
    // Normalize name: strip explicit portion text like "(Half)"
    const rawName = String(item?.name || '').trim();
    const baseName = rawName.replace(/\s*\(Half\)/i, '').trim();
    if (!baseName) return;
    const isHalf = (item?.portion === 'half') || /\bhalf\b/i.test(rawName);
    const qty = Number(item?.quantity ?? 0) || 0;
    const price = Number(item?.price ?? 0) || 0;
    if (!displayGroups[baseName]) {
      displayGroups[baseName] = {
        name: baseName,
        fullQuantity: 0,
        halfQuantity: 0,
        priceFull: 0,
        priceHalf: 0,
        amount: 0,
      };
    }
    if (isHalf) {
      displayGroups[baseName].halfQuantity += qty;
      if (price) displayGroups[baseName].priceHalf = price;
      displayGroups[baseName].amount += price * qty;
    } else {
      displayGroups[baseName].fullQuantity += qty;
      if (price) displayGroups[baseName].priceFull = price;
      displayGroups[baseName].amount += price * qty;
    }
  });

  const groupedItems = Object.values(displayGroups).map((g) => {
    const hasHalf = g.halfQuantity > 0;
    const hasFull = g.fullQuantity > 0;
    let qtyDisp = '';
    let rateDisp = '';
        if (hasHalf && hasFull) {
          qtyDisp = `×(${g.fullQuantity}+½)`;
          // As requested, hide half price and show only one rate (use full price as the line's rate)
          rateDisp = g.priceFull.toFixed(2);
    } else if (hasHalf) {
      qtyDisp = '×(½)';
            rateDisp = g.priceHalf.toFixed(2);
    } else {
      qtyDisp = `×(${g.fullQuantity})`;
      rateDisp = g.priceFull.toFixed(2);
    }
    return { name: g.name, quantity: qtyDisp, rate: rateDisp, amount: g.amount };
  });
  const subtotal = groupedItems.reduce((s, it) => s + (it.amount || 0), 0);
  const taxTotal = +(subtotal * taxRate);
  const halfTax = +(taxTotal / 2);
  const net = subtotal + taxTotal;

  const receiptStyle = {
    fontFamily: 'monospace',
    padding: '8px 12px',
    width: '72mm', // typical thermal receipt width
    background: '#fff',
    color: '#000',
    fontSize: 11,
    lineHeight: '1.15'
  };

  const dash = '--------------------------------';

  const [template, setTemplate] = useState(null);

  useEffect(() => {
    let mounted = true;
    // only fetch template if business doesn't provide gst/fssai
    if ((!business || !business.gstin) || (!business || !business.fssai)) {
      (async () => {
        try {
          const resp = await fetch(apiUrl('/api/bill-template'));
          if (!resp.ok) throw new Error(await resp.text());
          const data = await resp.json();
          if (!mounted) return;
          setTemplate(data || null);
        } catch (e) {
          // ignore - template is optional
          console.error('Failed to load bill template in ReceiptPrint', e);
        }
      })();
    }
    return () => { mounted = false; };
  }, [business]);

  return (
    <div className="receipt-root" style={receiptStyle}>
      {/* Header */}
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: 16, letterSpacing: 1.5, marginBottom: 4 }}>{(business.name || '').toUpperCase()}</div>
      {business.address && <div style={{ textAlign: 'center', fontSize: 9, marginBottom: 2 }}>{business.address}</div>}
      {/* GSTIN / FSSAI line - prefer business props, fall back to bill template */}
      <div style={{ textAlign: 'center', fontSize: 9, marginBottom: 6 }}>
        { (business?.gstin || template?.gstNumber) ? `GSTIN: ${business?.gstin || template?.gstNumber}` : '' }
        { (business?.fssai || template?.fssai) ? ` ${ (business?.gstin || template?.gstNumber) ? ' • ' : '' }FSSAI: ${business?.fssai || template?.fssai}` : '' }
      </div>

      <div style={{ textAlign: 'left', color: '#444', fontSize: 10 }}>{dash}</div>

      {/* Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <div style={{ fontSize: 11 }}>Bill No.</div>
        <div style={{ fontWeight: 800, fontSize: 11 }}>{billNumber || table?.billNumber || '—'}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11 }}>Table No:</div>
        <div style={{ fontSize: 11 }}>{table?.number || table?.tableNumber || '-'}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11 }}>DATE:</div>
        <div style={{ fontSize: 11 }}>{date || new Date().toLocaleDateString()}</div>
      </div>

      <div style={{ marginTop: 6, textAlign: 'left', color: '#444', fontSize: 10 }}>{dash}</div>

      {/* Items header */}
      <div style={{ display: 'flex', fontWeight: 700, marginTop: 6, fontSize: 11 }}>
        <div style={{ flex: 1 }}>Item</div>
        <div style={{ width: 48, textAlign: 'right' }}>Qty</div>
        <div style={{ width: 48, textAlign: 'right' }}>Price</div>
        <div style={{ width: 56, textAlign: 'right' }}>Amt</div>
      </div>

      {/* Items */}
      <div style={{ marginTop: 4, fontSize: 10 }}>
        {groupedItems.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ flex: 1 }}>{it.name}</div>
            <div style={{ width: 48, textAlign: 'right' }}>{it.quantity}</div>
            <div style={{ width: 48, textAlign: 'right' }}>{it.rate}</div>
            <div style={{ width: 56, textAlign: 'right' }}>{formatCurrency(it.amount)}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 6, textAlign: 'left', color: '#444', fontSize: 10 }}>{dash}</div>

      {/* Totals */}
      <div style={{ marginTop: 6, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Total</div>
          <div style={{ textAlign: 'right' }}>{formatCurrency(subtotal)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <div>SGST {((taxRate*100)/2).toFixed(2)}%</div>
          <div style={{ textAlign: 'right' }}>{formatCurrency(halfTax)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>CGST {((taxRate*100)/2).toFixed(2)}%</div>
          <div style={{ textAlign: 'right' }}>{formatCurrency(halfTax)}</div>
        </div>

        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 16 }}>
          <div>NET</div>
          <div>{formatCurrency(net)}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center', fontSize: 10, color: '#333' }}>{'<< VISIT AGAIN • THANK YOU >>'}</div>
    </div>
  );
};

export default ReceiptPrint;
