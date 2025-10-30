import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import OrderStatusIndicator from '../../components/ui/OrderStatusIndicator';
import TableGrid from './components/TableGrid';
import TableHistory from './components/TableHistory';
import TableActions from './components/TableActions';
import TableStatusOverview from './components/TableStatusOverview';


import api from '../../utils/api';
import { normalizeTables } from '../../utils/tables';

// Dev-only fallback data when backend is unavailable
const SAMPLE_TABLES = [
  { _id: 't1', id: 't1', number: 1, status: 'available', capacity: 4 },
  { _id: 't2', id: 't2', number: 2, status: 'occupied', capacity: 4, guestCount: 3, orderValue: 420.5, serviceDuration: 35, waiterName: 'Amit' },
  { _id: 't3', id: 't3', number: 3, status: 'billing', capacity: 2, orderValue: 180.0 },
  { _id: 't4', id: 't4', number: 4, status: 'needs-attention', capacity: 6 }
];

const TableManagementHistory = () => {
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeView, setActiveView] = useState('grid'); // 'grid', 'history', 'actions', 'overview'
  const [userRole, setUserRole] = useState('waiter');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Simulate user role detection
  useEffect(() => {
    const roles = ['waiter', 'owner', 'manager'];
    const randomRole = roles?.[Math.floor(Math.random() * roles?.length)];
    setUserRole(randomRole);
  }, []);

  // Fetch tables from backend
  const fetchTables = async () => {
    setLoadingTables(true);
    try {
  const res = await api.get('/tables');
    // Also fetch pending bills so we can mark tables with unpaid bills as 'running'
    let pendingBills = [];
    try {
      const billsRes = await api.get('/bills?status=pending');
      pendingBills = billsRes?.data || [];
    } catch (err) {
      // ignore bills fetch failure; we'll just not mark running tables
      pendingBills = [];
    }
    // Fetch active orders so we can detect if a table has other preparing orders.
    // If a table has a pending bill but also has other active orders (e.g., preparing),
    // we should show it as Running (occupied) and NOT show Unpaid for the tile.
    let activeOrders = [];
    try {
      const ordersRes = await api.get('/orders');
      activeOrders = ordersRes?.data || [];
    } catch (err) {
      activeOrders = [];
    }
    // If backend returns empty array, fall back to SAMPLE_TABLES for dev convenience
    const raw = (res?.data && res.data.length > 0) ? res.data : SAMPLE_TABLES;
    let data = normalizeTables(raw);
    // Annotate tables: if any pending bill references the table number, mark it as running
    const runningTableNumbers = new Set(pendingBills.map(b => b.tableNumber).filter(Boolean));
    // Build a map of tableNumber => count of active (non-completed/non-cancelled) orders
    const activeOrdersByTable = (activeOrders || []).reduce((acc, o) => {
      try {
        const tnum = (o.table && (o.table.number || o.table.tableNumber)) || o.tableNumber || null;
        const status = String(o.status || '').toLowerCase();
        const isActive = !['completed', 'cancelled', 'delivered'].includes(status);
        if (tnum != null && isActive) {
          acc[Number(tnum)] = (acc[Number(tnum)] || 0) + 1;
        }
      } catch (e) {}
      return acc;
    }, {});

    data = data.map(t => {
      try {
        const num = t?.number || t?.tableNumber || null;
        if (num != null && runningTableNumbers.has(num)) {
          const activeCount = activeOrdersByTable[Number(num)] || 0;
          // If there are other active orders for this table, prefer to show Running (occupied)
          // and do not surface Unpaid. Only mark hasPendingBill when no other active orders exist.
          if (activeCount > 0) {
            return { ...t, hasPendingBill: false };
          }
          return { ...t, status: 'running', hasPendingBill: true };
        }
      } catch (e) {}
      return { ...t, hasPendingBill: false };
    });
    // Normalize display status: treat 'running' as 'occupied' for counts and overview
    const getDisplayStatus = (s) => (s === 'running' ? 'occupied' : s);
  const normalized = data.map(t => ({ ...t, status: getDisplayStatus(t.status), hasPendingBill: !!t.hasPendingBill }));
    setTables(normalized);
    // Save latest tables globally for TableStatusOverview to use on mount
    window.latestTables = normalized;
    // Emit table-stats-updated event for TableStatusOverview with normalized counts
    const counts = normalized.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    window.dispatchEvent(new CustomEvent('table-stats-updated', {
      detail: { total: normalized.length, counts, tables: normalized }
    }));
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      // If backend is unreachable during development, show SAMPLE_TABLES so UI is usable
  const fallback = normalizeTables(SAMPLE_TABLES);
  setTables(fallback);
  window.latestTables = fallback;
  const counts = fallback.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      window.dispatchEvent(new CustomEvent('table-stats-updated', {
        detail: { total: SAMPLE_TABLES.length, counts, tables: SAMPLE_TABLES }
      }));
    }
    setLoadingTables(false);
  };

  useEffect(() => { fetchTables(); }, []);

  // Listen for global orders-updated events (dispatched by waiter/order pages)
  // and refresh tables so the UI reflects new orders without a full reload.
  useEffect(() => {
    const handleOrdersUpdated = (e) => {
      // Optionally inspect e.detail for more targeted updates in future
      fetchTables();
    };

    window.addEventListener('orders-updated', handleOrdersUpdated);
    const handleTablesUpdated = () => fetchTables();
    window.addEventListener('tables-updated', handleTablesUpdated);
    // Cross-tab
    let bc;
    try {
      bc = new BroadcastChannel('rf-updates');
      bc.onmessage = (e) => {
        if (!e || !e.data) return;
        const { topic } = e.data;
        if (topic === 'tables') fetchTables();
      };
    } catch (e) {}
    return () => {
      window.removeEventListener('orders-updated', handleOrdersUpdated);
      window.removeEventListener('tables-updated', handleTablesUpdated);
      try { if (bc) bc.close(); } catch (e) {}
    };
  }, []);

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    // Auto-switch to history view on mobile when table is selected
    if (window.innerWidth < 768) {
      setActiveView('history');
    }
  };

  const handleActionComplete = (actionType, table) => {
    if (actionType === 'take-order') {
      // Navigate to order-taking page, passing table number as state or param
      navigate('/waiter-order-taking', { state: { tableNumber: table?.number } });
      return;
    }
    if (actionType === 'view-current-orders') {
      // open the history view for the selected table
      if (table) setSelectedTable(table);
      setActiveView('history');
      return;
    }
    fetchTables(); // Refresh tables after action
    setTimeout(() => {
      if (table && table._id) {
        // Find updated table from new tables list after fetch
        const updated = window.latestTables?.find(t => t._id === table._id);
        if (updated) setSelectedTable(updated);
      }
      if (actionType === 'mark-available' || actionType === 'generate-bill') {
        setSelectedTable(null);
        setActiveView('grid');
      }
    }, 350);
  };

  const handleStatusFilterChange = (filter) => {
    setStatusFilter(filter);
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const navigationItems = [
    { id: 'grid', label: 'Table Grid', icon: 'Grid3X3', description: 'View all tables' },
    { id: 'overview', label: 'Overview', icon: 'BarChart3', description: 'Status overview' },
    { id: 'history', label: 'History', icon: 'History', description: 'Order history', disabled: !selectedTable },
    { id: 'actions', label: 'Actions', icon: 'Settings', description: 'Table actions', disabled: !selectedTable }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole={userRole} 
        onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      <div className="pt-16">
        {/* Top Status Bar */}
        <div className="bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-foreground">Table Management</h1>
            </div>
            <div className="flex items-center space-x-3">
              <OrderStatusIndicator showGlobalStatus={true} enableSound={true} />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-2">
              {selectedTable && (
                <div className="flex items-center space-x-2 text-sm">
                  <Icon name="Table" size={16} className="text-primary" />
                  <span className="font-medium">Table {selectedTable?.number}</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Icon name="Menu" size={16} />
              <span className="ml-2">Views</span>
            </Button>
          </div>
          
          {isMobileMenuOpen && (
            <div className="border-t border-border p-2">
              <div className="grid grid-cols-2 gap-2">
                {navigationItems?.map((item) => (
                  <Button
                    key={item?.id}
                    variant={activeView === item?.id ? 'default' : 'outline'}
                    size="sm"
                    disabled={item?.disabled}
                    onClick={() => handleViewChange(item?.id)}
                    className="justify-start"
                  >
                    <Icon name={item?.icon} size={14} />
                    <span className="ml-2">{item?.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex h-[calc(100vh-8rem)]">
          {/* Left Sidebar - Table Grid */}
          <div className="w-1/2 lg:w-1/3 border-r border-border overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <Icon name="Grid3X3" size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Tables</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <TableGrid 
                onTableSelect={handleTableSelect}
                selectedTableId={selectedTable?.id}
                userRole={userRole}
                tables={tables}
                loading={loadingTables}
                refreshTables={fetchTables}
              />
            </div>
          </div>

          {/* Center Panel - History/Overview */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <div className="flex border-b border-border">
              <Button
                variant={activeView === 'overview' ? 'default' : 'ghost'}
                onClick={() => setActiveView('overview')}
                className="rounded-none border-r border-border"
              >
                <Icon name="BarChart3" size={16} />
                <span className="ml-2">Overview</span>
              </Button>
              <Button
                variant={activeView === 'history' ? 'default' : 'ghost'}
                onClick={() => setActiveView('history')}
                disabled={!selectedTable}
                className="rounded-none"
              >
                <Icon name="History" size={16} />
                <span className="ml-2">History</span>
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {activeView === 'overview' && (
                <div className="h-full overflow-y-auto p-6">
                  <TableStatusOverview 
                    onFilterChange={handleStatusFilterChange}
                    currentFilter={statusFilter}
                  />
                </div>
              )}
              {activeView === 'history' && (
                <TableHistory 
                  selectedTable={selectedTable}
                  onClose={() => setSelectedTable(null)}
                />
              )}
            </div>
          </div>

          {/* Right Sidebar - Actions */}
          <div className="w-64 lg:w-72 border-l border-border overflow-hidden">
            <TableActions 
              selectedTable={selectedTable}
              userRole={userRole}
              onActionComplete={handleActionComplete}
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden h-[calc(100vh-12rem)]">
          {activeView === 'grid' && (
            <div className="h-full overflow-y-auto p-4">
              <TableGrid 
                onTableSelect={handleTableSelect}
                selectedTableId={selectedTable?.id}
                userRole={userRole}
                tables={tables}
                loading={loadingTables}
                refreshTables={fetchTables}
              />
            </div>
          )}
          
          {activeView === 'overview' && (
            <div className="h-full overflow-y-auto p-4">
              <TableStatusOverview 
                onFilterChange={handleStatusFilterChange}
                currentFilter={statusFilter}
              />
            </div>
          )}
          
          {activeView === 'history' && (
            <div className="h-full w-full">
              <TableHistory 
                selectedTable={selectedTable}
                onClose={() => {
                  setSelectedTable(null);
                  setActiveView('grid');
                }}
              />
            </div>
          )}
          
          {activeView === 'actions' && (
            <div className="h-full w-full">
              <TableActions 
                selectedTable={selectedTable}
                userRole={userRole}
                onActionComplete={handleActionComplete}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableManagementHistory;