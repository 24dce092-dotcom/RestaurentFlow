
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import OrderCard from './components/OrderCard';
import MetricsPanel from './components/MetricsPanel';
import { useState as useStateReact, useEffect as useEffectReact } from 'react';
import FilterPanel from './components/FilterPanel';
import OrderDetailsModal from './components/OrderDetailsModal';
import StatusCard from './components/StatusCard';

// Set to true to enable simulation, false to disable
const enableSimulation = false;

const OwnerLiveOrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
    table: 'all',
    urgentOnly: false
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tables, setTables] = useState([]);
  const [staff, setStaff] = useState(0);
  // Fetch tables for MetricsPanel
  useEffectReact(() => {
    async function fetchTables() {
      try {
        const res = await api.get('/tables');
        setTables(res.data);
      } catch (err) {
        setTables([]);
      }
    }
    fetchTables();
  }, []);


  // Fetch orders from backend (reusable)
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders');
      // Map tableNumber from populated table object for each order
      const mappedOrders = res.data.map(order => ({
        ...order,
        tableNumber: order?.table?.number || order?.tableNumber || 'N/A',
      }));
      setOrders(mappedOrders);
      setFilteredOrders(mappedOrders);
    } catch (err) {
      setOrders([]);
      setFilteredOrders([]);
      console.error('Failed to fetch orders:', err);
    }
  }, []);

  // Initial load + listen for new orders from waiter page
  useEffect(() => {
    fetchOrders();

    const handleOrdersUpdated = (e) => {
      // If the event provides a detail we could merge it, but simplest is to refetch
      fetchOrders();
    };

    window.addEventListener('orders-updated', handleOrdersUpdated);
    return () => {
      window.removeEventListener('orders-updated', handleOrdersUpdated);
    };
  }, [fetchOrders]);

  // Polling fallback: poll every 5s while the page is visible to ensure auto refresh
  useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') fetchOrders();
      }, 5000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Start immediately if visible
    if (document.visibilityState === 'visible') startPolling();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', fetchOrders);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', fetchOrders);
    };
  }, [fetchOrders]);

  // Optional simulation for development only. When disabled (default), there
  // will be no automatic order generation or random status changes.
  useEffect(() => {
    if (!enableSimulation) return undefined;

    const interval = setInterval(() => {
      setOrders(prevOrders => {
        const updatedOrders = prevOrders?.map(order => {
          // Randomly update some orders
          if (Math.random() > 0.9) {
            const statuses = ['received', 'preparing', 'ready', 'delivered'];
            const currentIndex = statuses?.indexOf(order?.status);
            if (currentIndex < statuses?.length - 1) {
              const newStatus = statuses?.[currentIndex + 1];
              return {
                ...order,
                status: newStatus,
                statusHistory: [
                  ...order?.statusHistory,
                  { status: newStatus, timestamp: new Date() }
                ]
              };
            }
          }
          return order;
        });

        // No automatic addition of new orders when simulation is disabled
        return updatedOrders;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [soundEnabled, enableSimulation]);

  // Apply filters
  useEffect(() => {
    let filtered = [...orders];

    // Search filter
    if (filters?.searchTerm) {
      filtered = filtered?.filter(order =>
        order?.id?.toLowerCase()?.includes(filters?.searchTerm?.toLowerCase()) ||
        order?.tableNumber?.toString()?.includes(filters?.searchTerm) ||
        order?.items?.some(item => item?.name?.toLowerCase()?.includes(filters?.searchTerm?.toLowerCase()))
      );
    }

    // Status filter
    if (filters?.status !== 'all') {
      filtered = filtered?.filter(order => order?.status === filters?.status);
    }

    // Table filter
    if (filters?.table !== 'all') {
      const tableNum = parseInt(filters?.table?.replace('table-', ''));
      filtered = filtered?.filter(order => order?.tableNumber === tableNum);
    }



    // Urgent only filter
    if (filters?.urgentOnly) {
      filtered = filtered?.filter(order => order?.priority === 'urgent');
    }

    // Sort orders
    filtered?.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'table':
          aValue = a?.tableNumber;
          bValue = b?.tableNumber;
          break;
        case 'total':
          aValue = a?.total;
          bValue = b?.total;
          break;
        case 'status':
          aValue = a?.status;
          bValue = b?.status;
          break;
        default:
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
  }, [orders, filters, sortBy, sortOrder]);

  const handleStatusUpdate = (orderId, newStatus) => {
    // Persist the status update to backend, then update local state from server
    (async () => {
      try {
        const prevOrder = orders?.find(o => (o._id || o.id) === orderId);
        const updatedPayload = {
          ...prevOrder,
          status: newStatus,
          statusHistory: [
            ...(prevOrder?.statusHistory || []),
            { status: newStatus, timestamp: new Date().toISOString() }
          ]
        };

        const res = await api.put(`/orders/${orderId}`, updatedPayload);
        const serverOrder = res.data;

        // Map tableNumber similar to fetchOrders
        const mapped = { ...serverOrder, tableNumber: serverOrder?.table?.number || serverOrder?.tableNumber || 'N/A' };

        setOrders(prevOrders => prevOrders?.map(o => ((o._id || o.id) === (mapped._id || mapped.id) ? mapped : o)));
        setFilteredOrders(prev => prev?.map(o => ((o._id || o.id) === (mapped._id || mapped.id) ? mapped : o)));

        // Notify other pages about the update
        try {
          window.dispatchEvent(new CustomEvent('orders-updated', { detail: mapped }));
        } catch (e) {
          // ignore dispatch errors
        }
      } catch (err) {
        console.error('Failed to update order status:', err);
        // fallback: optimistic update locally
        setOrders(prevOrders =>
          prevOrders?.map(order => {
            const oid = order?._id || order?.id;
            if (oid === orderId) {
              return {
                ...order,
                status: newStatus,
                statusHistory: [
                  ...(order?.statusHistory || []),
                  { status: newStatus, timestamp: new Date() }
                ]
              };
            }
            return order;
          })
        );
      }
    })();
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handlePrintOrder = async (order) => {
    try {
      // Create bill in backend
      const res = await api.post('/bills', { orderId: order._id || order.id });
      if (res.status === 201) {
        setOrders(prev => prev.filter(o => (o._id || o.id) !== (order._id || order.id)));
        setFilteredOrders(prev => prev.filter(o => (o._id || o.id) !== (order._id || order.id)));
      } else {
        alert('Failed to create bill.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStatusCounts = () => {
    return {
      total: orders?.length || 0,
      received: orders?.filter(o => o?.status === 'received')?.length,
      pending: orders?.filter(o => o?.status === 'pending')?.length,
      preparing: orders?.filter(o => o?.status === 'preparing')?.length,
      ready: orders?.filter(o => o?.status === 'ready')?.length,
      delivered: orders?.filter(o => o?.status === 'delivered')?.length,
      // Only count urgent orders that are still active (not delivered/completed/billed/cancelled)
      urgent: orders?.filter(o => o?.priority === 'urgent' && !['delivered', 'completed', 'billed', 'cancelled'].includes(o?.status))?.length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userRole="owner" onToggleSidebar={() => {}} />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Live Order Dashboard</h1>
                <p className="mt-2 text-gray-600">
                  Real-time monitoring of all restaurant orders and operations
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Sound Toggle */}
                <Button
                  variant={soundEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  <Icon name={soundEnabled ? "Volume2" : "VolumeX"} size={16} className="mr-2" />
                  Sound {soundEnabled ? 'On' : 'Off'}
                </Button>
                
                {/* Quick Navigation */}
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/analytics-reporting-dashboard'}
                >
                  <Icon name="BarChart3" size={16} className="mr-2" />
                  Analytics
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/billing-payment-management'}
                >
                  <Icon name="CreditCard" size={16} className="mr-2" />
                  Billing
                </Button>
              </div>
            </div>

            {/* Live Status Overview - updates when `orders` change and highlights urgent increases */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                // 'Received' shows orders that were taken and are not yet preparing (i.e. pending)
                { key: 'received', label: 'Received', value: statusCounts?.pending || 0, color: 'text-blue-600', icon: 'Clock', bg: 'bg-white' },
                { key: 'preparing', label: 'Preparing', value: statusCounts?.preparing || 0, color: 'text-yellow-600', icon: 'ChefHat', bg: 'bg-white' },
                { key: 'ready', label: 'Ready', value: statusCounts?.ready || 0, color: 'text-green-600', icon: 'CheckCircle', bg: 'bg-white' },
                { key: 'delivered', label: 'Delivered', value: statusCounts?.delivered || 0, color: 'text-gray-600', icon: 'Check', bg: 'bg-white' },
                { key: 'urgent', label: 'Urgent', value: statusCounts?.urgent || 0, color: 'text-red-600', icon: 'AlertTriangle', bg: 'bg-white border-red-200' }
              ]?.map((card) => (
                <StatusCard
                  key={card.key}
                  label={card.label}
                  value={card.value}
                  color={card.color}
                  icon={card.icon}
                  isUrgent={card.key === 'urgent'}
                />
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Panel - Filters */}
            <div className="lg:col-span-1">
              <FilterPanel 
                  onFiltersChange={handleFiltersChange}
                  activeFilters={filters}
                  statusCounts={statusCounts}
                  tableOptions={tables}
                />
            </div>

            {/* Center Panel - Orders */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200">
                {/* Orders Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Live Orders ({filteredOrders?.length})
                    </h2>
                    {/* Sort Options */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Sort by:</span>
                      <Button
                        variant={sortBy === 'timestamp' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleSort('timestamp')}
                      >
                        Time
                        {sortBy === 'timestamp' && (
                          <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={14} className="ml-1" />
                        )}
                      </Button>
                      <Button
                        variant={sortBy === 'table' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleSort('table')}
                      >
                        Table
                        {sortBy === 'table' && (
                          <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={14} className="ml-1" />
                        )}
                      </Button>
                      <Button
                        variant={sortBy === 'total' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleSort('total')}
                      >
                        Total
                        {sortBy === 'total' && (
                          <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={14} className="ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Orders List with Scroll */}
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                  {filteredOrders?.length === 0 ? (
                    <div className="text-center py-12">
                      <Icon name="ClipboardList" size={48} className="mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                      <p className="text-gray-600">
                        {filters?.searchTerm || filters?.status !== 'all' || filters?.urgentOnly ? 'Try adjusting your filters to see more orders.' : 'New orders will appear here in real-time.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredOrders?.map((order) => (
                        <OrderCard
                          key={order?._id || order?.id}
                          order={order}
                          onStatusUpdate={handleStatusUpdate}
                          onViewDetails={handleViewDetails}
                          onPrintOrder={handlePrintOrder}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Metrics */}
            <div className="lg:col-span-1">
              <MetricsPanel orders={orders} tables={tables} staff={staff} />
            </div>
          </div>
        </div>
      </div>
      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdate={handleStatusUpdate}
        onPrint={handlePrintOrder}
      />
    </div>
  );
};

export default OwnerLiveOrderDashboard;