import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { mergeItems } from '../../../utils/mergeBill';

const OrderDetailsModal = ({ order, isOpen, onClose, onStatusUpdate, onPrint }) => {
  if (!isOpen || !order) return null;

  const statusConfig = {
    received: { color: 'text-blue-600', bg: 'bg-blue-50', icon: 'Clock' },
    preparing: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: 'ChefHat' },
    ready: { color: 'text-green-600', bg: 'bg-green-50', icon: 'CheckCircle' },
    delivered: { color: 'text-gray-600', bg: 'bg-gray-50', icon: 'Check' }
  };

  const currentStatus = statusConfig?.[order?.status] || statusConfig?.received;

  // Use createdAt for order time
  const getTimeElapsed = () => {
    const now = new Date();
    const orderTime = new Date(order.createdAt || order.timestamp || Date.now());
    if (isNaN(orderTime.getTime())) return 'N/A';
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60));
    return diffMinutes;
  };

  const handleStatusChange = (newStatus) => {
    onStatusUpdate(order?.id, newStatus);
    onClose();
  };

  // Group items by base name for display, combining half and full portions
  const displayGroups = {};
  (order?.items || []).forEach(item => {
    const menuItem = item?.menuItem;
    const baseName = (menuItem?.name || item?.name || '').trim();
    if (!baseName) return;
    const isHalf = item?.portion === 'half';
    const qty = Number(item.quantity || 0);
    const price = Number(menuItem?.price || item?.price || 0);
    
    // Handle customizations
    let customizations = item?.notes || item?.customizations || '';
    if (typeof customizations === 'string') {
      if (customizations.includes(';')) customizations = customizations.split(';').map(s => s.trim()).filter(Boolean);
      else if (customizations.includes(',')) customizations = customizations.split(',').map(s => s.trim()).filter(Boolean);
      else if (customizations.length > 0) customizations = [customizations];
      else customizations = [];
    } else if (!Array.isArray(customizations)) {
      customizations = [];
    }
    
    if (!displayGroups[baseName]) {
      displayGroups[baseName] = {
        name: baseName,
        halfQuantity: 0,
        fullQuantity: 0,
        totalPrice: 0,
        customizations
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
      quantityDisplay = `${group.fullQuantity}`;
    }
    
    return {
      name: group.name,
      quantity: quantityDisplay,
      price: group.totalPrice,
      customizations: group.customizations
    };
  });

  const calculateSubtotal = () => {
    return mappedItems.reduce((sum, item) => sum + (item?.price || 0), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg text-lg font-semibold ${order?.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                Table {order?.tableNumber || order?.table?.number || 'N/A'}
              </div>
              {order?.priority === 'urgent' && (
                <div className="flex items-center space-x-2 text-red-600">
                  <Icon name="AlertTriangle" size={20} />
                  <span className="font-medium">URGENT ORDER</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={24} />
            </Button>
          </div>

          {/* Order Info */}
          <div className="p-6 space-y-6">
            {/* Status and Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Status</h3>
                <div className={`inline-flex items-center px-4 py-2 rounded-lg ${currentStatus?.bg} ${currentStatus?.color}`}>
                  <Icon name={currentStatus?.icon} size={20} className="mr-2" />
                  <span className="font-medium">
                    {order?.status?.charAt(0)?.toUpperCase() + order?.status?.slice(1)}
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <div>Order placed: {order?.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</div>
                  <div>Time elapsed: {getTimeElapsed()} minutes</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono text-gray-900">#{order?._id || order?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waiter:</span>
                    <span className="text-gray-900">{order?.waiterName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="text-gray-900">{mappedItems.length} item{mappedItems.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-4">
                  {mappedItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {item.quantity} {item.name}
                          </span>
                        </div>
                        {item?.customizations && item?.customizations.length > 0 && (
                          <div className="mt-1 text-sm text-gray-600 ml-4">
                            <Icon name="Edit" size={14} className="inline mr-1" />
                            <ul className="list-disc list-inside">
                              {item.customizations.map((note, idx) => (
                                <li key={idx}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {item.price ? item.price.toFixed(2) : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Total */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">${calculateSubtotal()?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (8%):</span>
                      <span className="text-gray-900">${calculateTax()?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">${(order?.total ?? calculateSubtotal() + calculateTax()).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {order?.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Notes</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Icon name="MessageSquare" size={20} className="text-yellow-600 mt-0.5" />
                    <p className="text-gray-700">{order?.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status History */}
            {order?.statusHistory && order?.statusHistory?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Status History</h3>
                <div className="space-y-2">
                  {order?.statusHistory?.map((status, index) => (
                    <div key={index} className="flex items-center space-x-3 text-sm">
                      <div className={`w-2 h-2 rounded-full ${statusConfig?.[status?.status]?.bg || 'bg-gray-200'}`} />
                      <span className="text-gray-600">
                        {status?.status?.charAt(0)?.toUpperCase() + status?.status?.slice(1)}
                      </span>
                      <span className="text-gray-500">
                        {new Date(status.timestamp)?.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              {order?.status === 'received' && (
                <Button
                  variant="default"
                  onClick={() => handleStatusChange('preparing')}
                >
                  Start Preparing
                </Button>
              )}
              {order?.status === 'preparing' && (
                <Button
                  variant="success"
                  onClick={() => handleStatusChange('ready')}
                >
                  Mark Ready
                </Button>
              )}
              {order?.status === 'ready' && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('delivered')}
                >
                  Mark Delivered
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;