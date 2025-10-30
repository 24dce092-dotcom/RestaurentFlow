import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import { shouldSimulate } from '../../utils/autoSim';

const OrderStatusIndicator = ({ 
  orderId = null, 
  showGlobalStatus = true, 
  enableSound = false,
  className = "" 
}) => {
  const [orderStats, setOrderStats] = useState({
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    urgent: 0
  });
  
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isConnected, setIsConnected] = useState(true);

  // Simulate WebSocket connection for real-time updates
  useEffect(() => {
  if (!shouldSimulate()) return undefined;

    const interval = setInterval(() => {
      const newStats = {
        pending: Math.floor(Math.random() * 8) + 1,
        preparing: Math.floor(Math.random() * 12) + 2,
        ready: Math.floor(Math.random() * 5),
        served: Math.floor(Math.random() * 20) + 5,
        urgent: Math.floor(Math.random() * 3)
      };
      
      // Simulate urgent order sound notification
      if (enableSound && newStats?.urgent > orderStats?.urgent) {
        // In real implementation, play notification sound
        console.log('🔔 Urgent order notification');
      }
      
      setOrderStats(newStats);
      setLastUpdate(Date.now());
    }, 4000);

    // Simulate connection status
    const connectionCheck = setInterval(() => {
      setIsConnected(Math.random() > 0.1); // 90% uptime simulation
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(connectionCheck);
    };
  }, [orderStats?.urgent, enableSound]);

  const statusConfig = [
    {
      key: 'urgent',
      label: 'Urgent',
      icon: 'AlertTriangle',
      color: 'text-error',
      bgColor: 'bg-error',
      count: orderStats?.urgent,
      priority: 1
    },
    {
      key: 'ready',
      label: 'Ready',
      icon: 'CheckCircle',
      color: 'text-success',
      bgColor: 'bg-success',
      count: orderStats?.ready,
      priority: 2
    },
    {
      key: 'preparing',
      label: 'Preparing',
      icon: 'Clock',
      color: 'text-warning',
      bgColor: 'bg-warning',
      count: orderStats?.preparing,
      priority: 3
    },
    {
      key: 'pending',
      label: 'Pending',
      icon: 'Circle',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      count: orderStats?.pending,
      priority: 4
    }
  ];

  const totalActiveOrders = orderStats?.pending + orderStats?.preparing + orderStats?.ready;
  const highestPriorityStatus = statusConfig?.filter(status => status?.count > 0)?.sort((a, b) => a?.priority - b?.priority)?.[0];

  if (!showGlobalStatus && !orderId) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'} ${!isConnected ? 'animate-pulse' : ''}`} 
           title={isConnected ? 'Connected' : 'Connection lost'} />
      {showGlobalStatus && (
        <>
          {/* Primary Status Indicator */}
          {highestPriorityStatus && (
            <div className="flex items-center space-x-1">
              <div className={`relative ${highestPriorityStatus?.color}`}>
                <Icon name={highestPriorityStatus?.icon} size={16} />
                {highestPriorityStatus?.key === 'urgent' && (
                  <div className="absolute -inset-1 bg-error/20 rounded-full animate-ping" />
                )}
              </div>
              <span className={`text-xs font-medium ${highestPriorityStatus?.color}`}>
                {highestPriorityStatus?.count}
              </span>
            </div>
          )}

          {/* Total Orders Badge */}
          {totalActiveOrders > 0 && (
            <div className="flex items-center space-x-1">
              <Icon name="ClipboardList" size={14} className="text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {totalActiveOrders}
              </span>
            </div>
          )}

          {/* Detailed Status (Desktop) */}
          <div className="hidden lg:flex items-center space-x-3">
            {statusConfig?.map((status) => (
              status?.count > 0 && (
                <div key={status?.key} className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${status?.bgColor}`} />
                  <span className="text-xs text-muted-foreground">
                    {status?.label}: {status?.count}
                  </span>
                </div>
              )
            ))}
          </div>
        </>
      )}
      {/* Last Update Timestamp */}
      <span className="text-xs text-muted-foreground hidden xl:inline">
        Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
      </span>
    </div>
  );
};

export default OrderStatusIndicator;