import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { shouldSimulate } from '../../../utils/autoSim';

const TableStatusOverview = ({ onFilterChange, currentFilter }) => {
  const [stats, setStats] = useState({
    total: 0,
    occupied: 0,
    available: 0,
    billing: 0,
    cleaning: 0,
    reserved: 0,
    needsAttention: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    occupancyRate: 0
  });

  useEffect(() => {
    // On mount, try to get latest tables from window.latestTables (set by parent fetchTables)
    // Handler to update stats from event or from window.latestTables
    const handler = (e) => {
      let tables = window.latestTables;
      if (e && e.detail && Array.isArray(e.detail.tables)) {
        tables = e.detail.tables;
      }
      if (tables && Array.isArray(tables)) {
        try {
          const total = tables.length;
          const counts = tables.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          }, {});
          const occupied = counts.occupied || 0;
          const billing = counts.billing || 0;
          const cleaning = counts.cleaning || 0;
          const reserved = counts.reserved || 0;
          const needsAttention = counts['needs-attention'] || 0;
          const available = total - occupied - billing - cleaning - reserved - needsAttention;
          const totalRevenue = tables.reduce((s, t) => s + (t?.orderValue || 0), 0);
          const averageOrderValue = (occupied + billing) > 0 ? Math.round(totalRevenue / Math.max(1, occupied + billing)) : 0;
          const occupancyRate = total > 0 ? ((occupied + billing) / total) * 100 : 0;
          setStats({
            total,
            occupied,
            available: Math.max(0, available),
            billing,
            cleaning,
            reserved,
            needsAttention,
            totalRevenue,
            averageOrderValue,
            occupancyRate
          });
        } catch (err) {
          // fallback - keep existing stats
        }
      }
    };

    // Initial run
    handler();
    window.addEventListener('table-stats-updated', handler);
    return () => window.removeEventListener('table-stats-updated', handler);
  }, []);

  // Helpers to safely format numbers and percentages
  const safeNum = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const formatInt = (v) => String(Math.round(safeNum(v)));
  const formatMoney = (v) => {
    const n = safeNum(v);
    try {
      return n === 0 ? '0' : n.toLocaleString();
    } catch (e) {
      return String(n);
    }
  };
  const formatFloat = (v, digits = 1) => {
    const n = safeNum(v);
    try {
      return n.toFixed(digits);
    } catch (e) {
      return String(Math.round(n));
    }
  };
  const percentOf = (count, total) => {
    const t = safeNum(total);
    if (t === 0) return '0';
    return String(Math.round((safeNum(count) / t) * 100));
  };

  const statusItems = [
    {
      key: 'occupied',
      label: 'Occupied',
      icon: 'Users',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      count: stats?.occupied,
      description: 'Tables with active guests'
    },
    {
      key: 'available',
      label: 'Available',
      icon: 'Circle',
      color: 'text-success',
      bgColor: 'bg-success/10',
      count: stats?.available,
      description: 'Ready for new guests'
    },
    {
      key: 'billing',
      label: 'Billing',
      icon: 'CreditCard',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      count: stats?.billing,
      description: 'Processing payment'
    },
    {
      key: 'cleaning',
      label: 'Cleaning',
      icon: 'Sparkles',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/20',
      count: stats?.cleaning,
      description: 'Being cleaned'
    },
    {
      key: 'reserved',
      label: 'Reserved',
      icon: 'Clock',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      count: stats?.reserved,
      description: 'Reserved for future'
    },
    {
      key: 'needs-attention',
      label: 'Needs Attention',
      icon: 'AlertTriangle',
      color: 'text-error',
      bgColor: 'bg-error/10',
      count: stats?.needsAttention,
      description: 'Requires immediate attention'
    }
  ];

  const handleFilterClick = (filterKey) => {
    const newFilter = currentFilter === filterKey ? 'all' : filterKey;
    onFilterChange(newFilter);
  };

  return (
    <div className="space-y-6">
      {/* Status Breakdown */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusItems.filter(item => ['occupied','available','reserved','cleaning'].includes(item.key)).map((item) => (
            <button
              key={item?.key}
              onClick={() => handleFilterClick(item?.key)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md ${
                currentFilter === item?.key
                  ? 'border-primary bg-primary/5' :'border-border hover:border-border/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${item?.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon name={item?.icon} size={20} className={item?.color} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{formatInt(item?.count)}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">{item?.label}</h4>
                <p className="text-sm text-muted-foreground">{item?.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-success">{stats?.available}</div>
          <div className="text-sm text-muted-foreground">Available Now</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{stats?.total}</div>
          <div className="text-sm text-muted-foreground">Total Tables</div>
        </div>
      </div>
    </div>
  );
};

export default TableStatusOverview;