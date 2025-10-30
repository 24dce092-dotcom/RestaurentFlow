import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { mergeItems } from '../../../utils/mergeBill';

const OrderCard = ({ order, onStatusUpdate, onViewDetails, onPrintOrder }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    pending: { color: 'text-blue-600', bg: 'bg-blue-50', icon: 'Clock', next: 'preparing' },
    received: { color: 'text-blue-600', bg: 'bg-blue-50', icon: 'Clock', next: 'preparing' },
    preparing: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: 'ChefHat', next: 'ready' },
    ready: { color: 'text-green-600', bg: 'bg-green-50', icon: 'CheckCircle', next: 'delivered' },
    delivered: { color: 'text-gray-600', bg: 'bg-gray-50', icon: 'Check', next: null }
  };

  const priorityConfig = {
    normal: { color: 'text-gray-600', bg: 'bg-gray-100' },
    urgent: { color: 'text-red-600', bg: 'bg-red-100' }
  };

  const currentStatus = statusConfig?.[order?.status] || statusConfig?.pending;
  const currentPriority = priorityConfig?.[order?.priority] || priorityConfig?.normal;

  const getTimeElapsed = () => {
    const now = new Date();
    const orderTime = new Date(order.timestamp);
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60));
    return diffMinutes;
  };

  const handleStatusChange = (newStatus) => {
    onStatusUpdate(order?._id || order?.id, newStatus);
  };

  // Clickable status badge handler
  const handleStatusBadgeClick = (e) => {
    e.stopPropagation();
    const nextStatus = currentStatus?.next;
    if (nextStatus) {
      handleStatusChange(nextStatus);
    }
  };

  // Get table number from populated table object
  const tableNumber = order?.table?.number || order?.tableNumber || 'N/A';

  // Normalize items and use central mergeItems to aggregate duplicates
  const normalized = (order?.items || []).map(item => {
    const menuItem = item?.menuItem;
    return {
      _id: item?._id || item?.id || menuItem?._id || menuItem?.id,
      name: menuItem?.name || item?.name || 'Unknown',
      price: menuItem?.price ?? item?.price ?? 0,
      quantity: item?.quantity || 0,
      portion: item?.portion || 'full', // Preserve portion information
      specialRequest: item?.notes || item?.customizations || ''
    };
  });

  // Group items by base name for display, combining half and full portions
  const displayGroups = {};
  (order?.items || []).forEach(item => {
    const menuItem = item?.menuItem;
    const baseName = (menuItem?.name || item?.name || '').trim();
    if (!baseName) return;
    const isHalf = item?.portion === 'half';
    const qty = Number(item.quantity || 0);
    const price = Number(menuItem?.price || item?.price || 0);
    
    if (!displayGroups[baseName]) {
      displayGroups[baseName] = {
        name: baseName,
        halfQuantity: 0,
        fullQuantity: 0,
        totalPrice: 0
      };
    }
    if (isHalf) {
      displayGroups[baseName].halfQuantity += qty;
    } else {
      displayGroups[baseName].fullQuantity += qty;
    }
    displayGroups[baseName].totalPrice += (price * qty);
  });
  
  const mappedItems = Object.values(displayGroups).map(group => {
    const hasHalf = group.halfQuantity > 0;
    const hasFull = group.fullQuantity > 0;
    let quantityDisplay = '';
    
    if (hasHalf && hasFull) {
      quantityDisplay = `${group.fullQuantity}+½`;
    } else if (hasHalf) {
      quantityDisplay = '½';
    } else {
      quantityDisplay = `${group.fullQuantity}x`;
    }
    
    return {
      name: group.name,
      quantity: quantityDisplay,
      price: group.totalPrice
    };
  });

  return (
    <div className={`bg-white rounded-lg border-2 ${order?.priority === 'urgent' ? 'border-red-200' : 'border-gray-200'} shadow-sm hover:shadow-md transition-all duration-200`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentPriority?.bg} ${currentPriority?.color}`}>
              Table {tableNumber}
            </div>
            {order?.priority === 'urgent' && (
              <div className="flex items-center space-x-1 text-red-600">
                <Icon name="AlertTriangle" size={16} />
                <span className="text-xs font-medium">URGENT</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className={`px-2 py-1 rounded-md text-xs font-medium focus:outline-none transition ${currentStatus?.bg} ${currentStatus?.color} ${currentStatus?.next ? 'hover:brightness-90 cursor-pointer' : 'opacity-60 cursor-default'}`}
              title={currentStatus?.next ? `Click to mark as ${currentStatus.next.charAt(0).toUpperCase() + currentStatus.next.slice(1)}` : 'Final status'}
              onClick={handleStatusBadgeClick}
              disabled={!currentStatus?.next}
            >
              <Icon name={currentStatus?.icon} size={12} className="inline mr-1" />
              {order?.status?.charAt(0)?.toUpperCase() + order?.status?.slice(1)}
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={16} />
            </Button>
          </div>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
          <span>Waiter: {order?.waiterName}</span>
          <span>{getTimeElapsed()}m ago</span>
        </div>
      </div>
      {/* Order Items Preview */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {mappedItems.length} item{mappedItems.length !== 1 ? 's' : ''}
          </span>
          <span className="text-lg font-semibold text-gray-900">
            ${order?.total?.toFixed(2)}
          </span>
        </div>
        {/* First 2 items preview */}
        <div className="space-y-1">
          {mappedItems.slice(0, 2).map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.quantity} {item.name}
              </span>
              <span className="text-gray-900">${item.price?.toFixed(2)}</span>
            </div>
          ))}
          {mappedItems.length > 2 && (
            <div className="text-xs text-gray-500">
              +{mappedItems.length - 2} more item{mappedItems.length - 2 !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="space-y-3">
            {/* All Items */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Order Details</h4>
              <div className="space-y-2">
                {mappedItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-900">{item.quantity} {item.name}</span>
                    </div>
                    <span className="text-gray-900">${item.price?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Notes */}
            {order?.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Customer Notes</h4>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                  {order?.notes}
                </p>
              </div>
            )}

            {/* Order Timeline */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Timeline</h4>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Received: {new Date(order.timestamp)?.toLocaleTimeString()}</div>
                {order?.statusHistory?.map((status, index) => (
                  <div key={index}>
                    {status?.status}: {new Date(status.timestamp)?.toLocaleTimeString()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {order?.status === 'received' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleStatusChange('preparing')}
              >
                Start Preparing
              </Button>
            )}
            {order?.status === 'preparing' && (
              <Button
                variant="success"
                size="sm"
                onClick={() => handleStatusChange('ready')}
              >
                Mark Ready
              </Button>
            )}
            {order?.status === 'ready' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('delivered')}
              >
                Mark Delivered
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(order)}
            >
              <Icon name="Eye" size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPrintOrder(order)}
            >
              <Icon name="Printer" size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;