import React, { useEffect, useState } from 'react';
import { apiUrl } from '../../../utils/api';

const formatCurrency = (amount) => {
  return Number(amount || 0).toFixed(2);
};

const PdfReceipt = ({ table = {}, items = [], business = {}, billNumber, date, viewWidth = '210mm' }) => {
  // Merge items by base name; sum full/half counts and amounts
  const displayGroups = {};
  (items || []).forEach((item) => {
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
      // Hide half price; show only one rate (use full price)
      rateDisp = formatCurrency(g.priceFull);
    } else if (hasHalf) {
      qtyDisp = '×(½)';
      rateDisp = formatCurrency(g.priceHalf);
    } else {
      qtyDisp = `×(${g.fullQuantity})`;
      rateDisp = formatCurrency(g.priceFull);
    }
    return { name: g.name, quantity: qtyDisp, rate: rateDisp, amount: g.amount };
  });

  const subtotal = groupedItems.reduce((s, it) => s + (it.amount || 0), 0);
  const tax = +(subtotal * 0.08);
  const total = subtotal + tax;

  const [template, setTemplate] = useState(null);

  useEffect(() => {
    let mounted = true;
    // fetch bill template if business doesn't provide required meta
    (async () => {
      try {
        if ((!business || !business.gstNumber) || (!business || !business.fssai) || (!business || !business.name)) {
          const resp = await fetch(apiUrl('/api/bill-template'));
          if (!resp.ok) throw new Error('no template');
          const data = await resp.json();
          if (!mounted) return;
          setTemplate(data || null);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [business]);

  const containerStyle = {
    fontFamily: 'monospace, Inter, Arial, sans-serif',
    padding: '28px 32px',
    width: viewWidth,
    maxWidth: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    color: '#111'
  };

  const dashed = '------------------------------------------';

  return (
    <div style={containerStyle} className="pdf-receipt-root">
  <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 800 }}>{business?.name || template?.restaurantName || 'Restaurant'}</div>
  <div style={{ textAlign: 'center', marginTop: 6, color: '#666' }}>{business?.address || template?.address || ''}</div>
    <div style={{ marginTop: 16, textAlign: 'center', color: '#666' }}>{dashed}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <div>Bill No.</div>
        <div style={{ fontWeight: 700 }}>{billNumber || table?.billNumber || ''}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>Table No:</div>
        <div>{table?.tableNumber || table?.number || '-'}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>DATE:</div>
        <div>{date || new Date().toLocaleDateString()}</div>
      </div>

  <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }} />

      <div style={{ display: 'flex', fontWeight: 700, marginTop: 12, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>Description</div>
        <div style={{ width: 70, textAlign: 'right' }}>Qty</div>
        <div style={{ width: 100, textAlign: 'right' }}>Rate</div>
        <div style={{ width: 80, textAlign: 'right' }}>Amount</div>
      </div>

      <div style={{ marginTop: 8 }}>
        {groupedItems.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ flex: 1 }}>{it.name}</div>
            <div style={{ width: 70, textAlign: 'right' }}>{it.quantity}</div>
            <div style={{ width: 100, textAlign: 'right' }}>{it.rate}</div>
            <div style={{ width: 80, textAlign: 'right' }}>{formatCurrency(it.amount)}</div>
          </div>
        ))}
      </div>

  <div style={{ marginTop: 14, borderTop: '1px dashed #ddd', paddingTop: 12 }} />

      {/* totals area: left labels and right-aligned tabular amounts */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', alignItems: 'start', gap: 8 }}>
          <div style={{}}>Total Rs.</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(subtotal)}</div>

          <div>SGST 10% Rs.</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tax / 2)}</div>

          <div>CGST 50% Rs.</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tax / 2)}</div>

          <div>Service Tax 25% Rs.</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tax * 0.25)}</div>

          {/* dashed separator spanning left column */}
          <div style={{ gridColumn: '1 / -1', marginTop: 8, borderTop: '1px dashed #ddd', paddingTop: 10 }} />

          <div style={{ fontWeight: 900, fontSize: 22, marginTop: 6 }}>Net Rs. :</div>
          <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(total + (tax * 0.25))}</div>
        </div>
      </div>

      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12, color: '#666' }}>
        GSTIN : {business?.gstNumber || business?.gstin || template?.gstNumber || template?.gstin || ' - '}
        <br />
        FSSAI : {business?.fssai || template?.fssai || ' - '}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12 }}>&lt;&lt;VISIT AGAIN, THANK YOU&gt;&gt;</div>

      <div style={{ marginTop: 18, borderTop: '1px solid #f1f1f1', paddingTop: 12, textAlign: 'center', color: '#888', fontSize: 11 }}>
        Thank you for dining with us!
        <br />
        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
      </div>

    </div>
  );
};

export default PdfReceipt;
