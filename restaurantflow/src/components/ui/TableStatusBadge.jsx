import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import { shouldSimulate } from '../../utils/autoSim';

const TableStatusBadge = ({ 
  tableId = null, 
  showGlobalStatus = true, 
  size = 'default',
  className = "" 
}) => {
  const [tableStats, setTableStats] = useState({
    occupied: 0,
    available: 0,
    billing: 0,
    cleaning: 0,
    reserved: 0,
    needsAttention: 0
  });

  const [specificTableStatus, setSpecificTableStatus] = useState(null);

  useEffect(() => {
    if (!shouldSimulate()) return undefined;
    // Simulate real-time table status updates
    const interval = setInterval(() => {
      const totalTables = 24; // Restaurant has 24 tables
      const occupied = Math.floor(Math.random() * 12) + 8;
      const billing = Math.floor(Math.random() * 4) + 1;
      const cleaning = Math.floor(Math.random() * 3);
      const reserved = Math.floor(Math.random() * 3) + 1;
      const needsAttention = Math.floor(Math.random() * 2);
      const available = totalTables - occupied - billing - cleaning - reserved;

      setTableStats({
        occupied,
        available: Math.max(0, available),
        billing,
        cleaning,
        reserved,
        needsAttention
      });

      // If specific table ID provided, simulate its status
      if (tableId) {
        const statuses = ['occupied', 'available', 'billing', 'cleaning', 'reserved'];
        const randomStatus = statuses?.[Math.floor(Math.random() * statuses?.length)];
        setSpecificTableStatus({
          status: randomStatus,
          guestCount: randomStatus === 'occupied' ? Math.floor(Math.random() * 6) + 1 : 0,
          timeElapsed: Math.floor(Math.random() * 120) + 15, // 15-135 minutes
          needsAttention: Math.random() > 0.8
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tableId]);

  const statusConfig = {
    occupied: {
      label: 'Occupied',
      icon: 'Users',
      color: 'text-primary',
      bgColor: 'bg-primary',
      lightBg: 'bg-primary/10'
    },
    available: {
      label: 'Available',
      icon: 'Circle',
      color: 'text-success',
      bgColor: 'bg-success',
      lightBg: 'bg-success/10'
    },
    billing: {
      label: 'Billing',
      icon: 'CreditCard',
      color: 'text-warning',
      bgColor: 'bg-warning',
      lightBg: 'bg-warning/10'
    },
    cleaning: {
      label: 'Cleaning',
      icon: 'Sparkles',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      lightBg: 'bg-muted/20'
    },
    reserved: {
      label: 'Reserved',
      icon: 'Clock',
      color: 'text-secondary',
      bgColor: 'bg-secondary',
      lightBg: 'bg-secondary/10'
    },
    needsAttention: {
      label: 'Attention',
      icon: 'AlertCircle',
      color: 'text-error',
      bgColor: 'bg-error',
      lightBg: 'bg-error/10'
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  // Render specific table status
  if (tableId && specificTableStatus) {
    const config = statusConfig?.[specificTableStatus?.status];
    return (
      <div className={`inline-flex items-center space-x-2 rounded-md ${config?.lightBg} ${sizeClasses?.[size]} ${className}`}>
        <div className={`relative ${config?.color}`}>
          <Icon name={config?.icon} size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
          {specificTableStatus?.needsAttention && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
          )}
        </div>
        <span className={`font-medium ${config?.color}`}>
          Table {tableId}
        </span>
        {specificTableStatus?.status === 'occupied' && (
          <span className="text-xs text-muted-foreground">
            {specificTableStatus?.guestCount} guests • {specificTableStatus?.timeElapsed}m
          </span>
        )}
      </div>
    );
  }

  // Render global status overview
  if (!showGlobalStatus) {
    return null;
  }

  const priorityStatuses = [
    { key: 'needsAttention', ...statusConfig?.needsAttention, count: tableStats?.needsAttention },
    { key: 'billing', ...statusConfig?.billing, count: tableStats?.billing },
    { key: 'occupied', ...statusConfig?.occupied, count: tableStats?.occupied },
    { key: 'available', ...statusConfig?.available, count: tableStats?.available }
  ]?.filter(status => status?.count > 0);

  const totalTables = Object.values(tableStats)?.reduce((sum, count) => sum + count, 0);
  const occupancyRate = totalTables > 0 ? Math.round((tableStats?.occupied / totalTables) * 100) : 0;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Priority Status Indicators */}
      {priorityStatuses?.slice(0, 3)?.map((status) => (
        <div key={status?.key} className="flex items-center space-x-1">
          <div className={`relative ${status?.color}`}>
            <Icon name={status?.icon} size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
            {status?.key === 'needsAttention' && status?.count > 0 && (
              <div className="absolute -inset-1 bg-error/20 rounded-full animate-ping" />
            )}
          </div>
          <span className={`${sizeClasses?.[size]} font-medium ${status?.color}`}>
            {status?.count}
          </span>
        </div>
      ))}
      {/* Occupancy Rate (Desktop) */}
      <div className="hidden lg:flex items-center space-x-2">
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {occupancyRate}%
        </span>
      </div>
      {/* Detailed Breakdown (Extra Large Screens) */}
      <div className="hidden xl:flex items-center space-x-4">
        {Object.entries(tableStats)?.map(([key, count]) => {
          const config = statusConfig?.[key];
          if (!config || count === 0) return null;
          
          return (
            <div key={key} className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${config?.bgColor}`} />
              <span className="text-xs text-muted-foreground">
                {config?.label}: {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TableStatusBadge;