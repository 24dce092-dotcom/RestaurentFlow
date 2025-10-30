import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { mergeItems } from '../../../utils/mergeBill';
import api from '../../../utils/api';

const TableHistory = ({ selectedTable, onClose }) => {
  const [orderHistory, setOrderHistory] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Mock order history data
  useEffect(() => {
    if (!selectedTable) return;

    const fetchHistory = async () => {
      try {
        // Try to fetch real bills for the table using the shared api helper
        const tableNumRaw = selectedTable?.number || selectedTable?.tableNumber || selectedTable?.id;
        if (!tableNumRaw && tableNumRaw !== 0) {
          setOrderHistory([]);
          return;
        }
        const tableNum = Number(tableNumRaw);
        if (Number.isNaN(tableNum)) {
          console.warn('TableHistory: invalid tableNumber', tableNumRaw);
          setOrderHistory([]);
          return;
        }
        let bills = [];
        try {
          const resp = await api.get('/bills', { params: { tableNumber: tableNum } });
          bills = resp?.data || [];
        } catch (err) {
          console.error('Failed to fetch bills for table', tableNum, err);
          bills = [];
        }
        // Keep only live/unsettled bills (exclude paid/completed/cancelled)
        const liveBills = (bills || []).filter(b => {
          const s = String(b.status || '').toLowerCase();
          return !['paid', 'completed', 'cancelled'].includes(s);
        });
        // Map bills to the order history shape used by this component
        let mapped = (liveBills || []).map(b => ({
          id: b._id,
          tableNumber: b.tableNumber,
          orderNumber: b.billNumber || `#${b.billSeq || ''}`,
          timestamp: new Date(b.createdAt || Date.now()),
          status: (String(b.status || '').toLowerCase() === 'pending') ? 'in-progress' : (b.status || 'in-progress'),
          waiterName: b.waiterName || '',
          guestCount: b.guestCount || null,
          items: b.items || [],
          subtotal: (b.items || []).reduce((s,it)=>s+((it.price||0)*(it.quantity||1)),0),
          tax: 0,
          total: b.totalAmount || 0,
          paymentMethod: (String(b.status || '').toLowerCase() === 'paid') ? (b.paymentMethod || 'Unknown') : null,
          notes: b.notes || ''
        }));
        // If there are no bills, fallback to fetching active orders and map them to the same shape
        if ((!mapped || mapped.length === 0)) {
          try {
            const resp = await api.get('/orders');
            const orders = resp?.data || [];
            const tableOrders = (orders || []).filter(o => {
              // orders may have populated table or raw tableNumber
              const tnum = (o.table && (o.table.number || o.table.tableNumber)) || o.tableNumber || null;
              return Number(tnum) === tableNum;
            });
            mapped = (tableOrders || []).map(o => ({
              id: o._id,
              tableNumber: o.tableNumber || (o.table && o.table.number) || null,
              orderNumber: o.orderNumber || (`#${o._id?.slice?.(0,6)}`),
              timestamp: new Date(o.createdAt || o.created || Date.now()),
              status: (o.status === 'completed' || o.status === 'cancelled') ? o.status : 'in-progress',
              waiterName: o.waiterName || (o.table && o.table.waiterName) || '',
              guestCount: o.guestCount || null,
              items: o.items || [],
              subtotal: (o.items || []).reduce((s,it)=>s+((it.price||0)*(it.quantity||1)),0),
              tax: 0,
              total: o.total || o.orderTotal || 0,
              paymentMethod: null,
              notes: o.notes || ''
            }));
          } catch (err) {
            console.error('Failed to fetch orders for table fallback', tableNum, err);
          }
        }
        // Sort newest-first
        mapped.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        setOrderHistory(mapped);
      } catch (err) {
        console.error('Failed to load table bills, falling back to mock history:', err);
        // Fallback: keep previous mock generation for dev friendliness
        setOrderHistory([]);
      }
    };

    fetchHistory();
  }, [selectedTable]);

  const statusConfig = {
    'in-progress': {
      label: 'In Progress',
      icon: 'Clock',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    'completed': {
      label: 'Completed',
      icon: 'CheckCircle',
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    'cancelled': {
      label: 'Cancelled',
      icon: 'XCircle',
      color: 'text-error',
      bgColor: 'bg-error/10'
    },
    'pending': {
      label: 'Pending',
      icon: 'Circle',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/20'
    }
  };

  const filteredOrders = orderHistory;

  const formatTime = (date) => {
    return date?.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today - 24 * 60 * 60 * 1000);
    
    if (date?.toDateString() === today?.toDateString()) {
      return 'Today';
    } else if (date?.toDateString() === yesterday?.toDateString()) {
      return 'Yesterday';
    } else {
      return date?.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon name="Table" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Table</h3>
          <p className="text-muted-foreground">
            Choose a table from the grid to view its order history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Icon name="History" size={20} className="text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Table {selectedTable?.number} History
            </h2>
            <p className="text-sm text-muted-foreground">
              Order timeline and details
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <Icon name="X" size={20} />
        </Button>
      </div>
      {/* Filters removed per request: show full history without date/status filters */}
      {/* Order History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredOrders?.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="ClipboardList" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              No orders match the selected filters.
            </p>
          </div>
        ) : (
          filteredOrders?.map((order) => {
            const config = statusConfig?.[order?.status];
            const isExpanded = expandedOrder === order?.id;
            
            return (
              <div
                key={order?.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Order Header */}
                <button
                  onClick={() => toggleOrderExpansion(order?.id)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-md ${config?.bgColor}`}>
                        <Icon name={config?.icon} size={16} className={config?.color} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-foreground">
                            {order?.orderNumber}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${config?.bgColor} ${config?.color} font-medium`}>
                            {config?.label}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(order?.timestamp)} at {formatTime(order?.timestamp)} • {order?.waiterName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          ${order?.total?.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order?.items?.length} items
                        </div>
                      </div>
                      <Icon 
                        name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                        size={16} 
                        className="text-muted-foreground" 
                      />
                    </div>
                  </div>
                </button>
                {/* Expanded Order Details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/20">
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Order Items</h4>
                      <div className="space-y-2">
                        {(() => {
                          const normalized = (order?.items || []).map(itm => {
                            // Handle different shapes: { name, price, quantity } or { menuItem: { name, price }, qty }
                            const name = itm?.name || itm?.itemName || itm?.title || itm?.menuItem?.name || 'Item';
                            const price = Number(
                              (typeof itm?.price !== 'undefined' ? itm.price :
                                (typeof itm?.unitPrice !== 'undefined' ? itm.unitPrice :
                                  (itm?.menuItem?.price ?? 0)))
                            ) || 0;
                            const quantity = Number(itm?.quantity ?? itm?.qty ?? itm?.count ?? 1) || 1;
                            const id = itm?._id || itm?.id || (itm?.menuItem && itm.menuItem._id) || `${name}-${Math.random().toString(36).slice(2,6)}`;
                            const mods = itm?.modifications || itm?.notes || itm?.customizations || itm?.instructions || itm?.comment || (itm?.menuItem && itm.menuItem.notes) || '';
                            const modsText = Array.isArray(mods) ? mods.join(', ') : (mods || '');
                            return { _id: id, name, price, quantity, modifications: modsText };
                          });
                          let groups = mergeItems(normalized);
                          // If mergeItems removed all items (e.g., price/quantity validation),
                          // fall back to the raw normalized items so the UI still shows them.
                          if ((!groups || groups.length === 0) && (normalized || []).length > 0) {
                            groups = (normalized || []).map(it => ({
                              ...it,
                              price: Number(it.price || 0),
                              quantity: Number(it.quantity || 1),
                              modifications: it.modifications || ''
                            }));
                          }
                            // Helper to format merged quantity as ×(1+½), ×(½), ×(1)
                            function formatMergedQty(item) {
                              const full = Number(item.full || item.fullQty || item.fullCount || item.fullPlate || 0);
                              const half = Number(item.half || item.halfQty || item.halfCount || item.halfPlate || 0);
                              // If mergeItems didn't split, fallback to item.quantity
                              if ((full === 0 && half === 0) || (typeof item.full === 'undefined' && typeof item.half === 'undefined')) {
                                // If quantity is fractional (e.g. 1.5), show ×(1+½)
                                if (item.quantity === 0.5) return '×(½)';
                                if (item.quantity === 1) return '×(1)';
                                if (item.quantity % 1 === 0) return `×(${item.quantity})`;
                                if (item.quantity > 1 && item.quantity % 1 === 0.5) {
                                  return `×(${Math.floor(item.quantity)}+½)`;
                                }
                                return `×(${item.quantity})`;
                              }
                              let parts = [];
                              if (full > 0) parts.push(full);
                              if (half > 0) parts.push('½');
                              return `×(${parts.join('+')})`;
                            }
                            return groups.map((item) => (
                              <div key={item?._id || item?.name} className="">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-foreground">
                                    <span className="font-medium">{item?.name}</span>
                                    <span className="ml-2 text-muted-foreground">{formatMergedQty(item)}</span>
                                  </div>
                                  <div className="font-medium text-foreground">
                                    ${(item?.price * item?.quantity)?.toFixed(2)}
                                  </div>
                                </div>
                                {item?.modifications && (
                                  <div className="text-xs text-muted-foreground mt-1 ml-1">
                                    {item.modifications}
                                  </div>
                                )}
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TableHistory;