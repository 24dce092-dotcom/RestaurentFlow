import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { shouldSimulate } from '../../../utils/autoSim';

const MetricsPanel = ({ orders, tables, staff }) => {
  // Calculate metrics from live data
  const now = Date.now();
  const today = new Date();
  today.setHours(0,0,0,0);
  const ordersToday = orders?.filter(o => new Date(o.createdAt) >= today) || [];
  const completedOrders = ordersToday.filter(o => o.status === 'delivered' || o.status === 'completed');
  // Define which statuses are considered finished and should not count toward active tables
  const finishedStatuses = ['delivered', 'completed', 'billed', 'cancelled'];

  // Active orders are those not in finishedStatuses
  const activeOrders = (orders || []).filter(o => !finishedStatuses.includes(o?.status));

  // Normalize table number and only count valid numeric table identifiers
  const activeTableNumbers = activeOrders
    .map(o => {
      // Prefer explicit tableNumber, then populated table.number if available
      const tn = o?.tableNumber ?? (o?.table && o.table.number) ?? null;
      const num = typeof tn === 'number' ? tn : (tn ? Number(tn) : NaN);
      return Number.isFinite(num) ? num : null;
    })
    .filter(Boolean);

  const activeTables = [...new Set(activeTableNumbers)].length;
  const pendingOrders = activeOrders.length;
  const avgPrepTime = (() => {
    const times = completedOrders.map(o => {
      const created = new Date(o.createdAt).getTime();
      const updated = new Date(o.updatedAt).getTime();
      return (updated - created) / 60000;
    }).filter(Boolean);
    return times.length ? Math.round(times.reduce((a,b) => a+b, 0) / times.length) : 0;
  })();
  const currentRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const completionRate = ordersToday.length ? Math.round((completedOrders.length / ordersToday.length) * 100) : 0;
  const lastOrder = orders.length ? orders.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b) : null;
  const lastOrderTime = lastOrder ? new Date(lastOrder.createdAt) : null;
  // Kitchen load: simple logic based on pending orders
  let kitchenLoad = 'normal';
  if (pendingOrders > 10) kitchenLoad = 'high';
  else if (pendingOrders < 3) kitchenLoad = 'low';
  // Staff on duty: from prop or fallback
  const staffOnDuty = staff || 0;

  const metrics = {
    activeTables,
    pendingOrders,
    avgPrepTime,
    currentRevenue,
    ordersToday: completedOrders.length,
    completionRate
  };
  const realtimeData = {
    lastOrderTime,
    kitchenLoad,
    staffOnDuty
  };

  const metricCards = [
    // Active Tables metric removed per user request
    {
      title: 'Pending Orders',
      value: metrics?.pendingOrders,
      icon: 'Clock',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      change: 'Normal load'
    },
    {
      title: 'Today\'s Revenue',
      value: `$${metrics?.currentRevenue?.toLocaleString()}`,
      icon: 'DollarSign',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      change: '+12% vs yesterday'
    }
  ];

  const getKitchenLoadColor = () => {
    switch (realtimeData?.kitchenLoad) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'normal': return 'text-green-600 bg-green-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Icon name="Activity" size={20} className="mr-2 text-green-600" />
          Live Status
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Kitchen Load</span>
            <div className={`px-2 py-1 rounded-md text-xs font-medium ${getKitchenLoadColor()}`}>
              {realtimeData?.kitchenLoad?.toUpperCase()}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Staff on Duty</span>
            <span className="text-sm font-medium text-gray-900">
              {realtimeData?.staffOnDuty} waiters
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Order</span>
            <span className="text-sm font-medium text-gray-900">
              {realtimeData?.lastOrderTime ? 
                `${Math.floor((Date.now() - realtimeData?.lastOrderTime) / 60000)}m ago` : 
                'No recent orders'
              }
            </span>
          </div>
        </div>
      </div>
      {/* Key Metrics */}
      <div className="space-y-4">
        {metricCards?.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-md ${metric?.bg}`}>
                <Icon name={metric?.icon} size={20} className={metric?.color} />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {metric?.value}
                </div>
                <div className="text-xs text-gray-500">
                  {metric?.change}
                </div>
              </div>
            </div>
            <h4 className="text-sm font-medium text-gray-700">
              {metric?.title}
            </h4>
          </div>
        ))}
      </div>
      {/* Performance Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Icon name="TrendingUp" size={20} className="mr-2 text-blue-600" />
          Today's Performance
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Orders Completed</span>
              <span className="font-medium text-gray-900">{metrics?.ordersToday}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((metrics?.ordersToday / 200) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-medium text-gray-900">{metrics?.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics?.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;