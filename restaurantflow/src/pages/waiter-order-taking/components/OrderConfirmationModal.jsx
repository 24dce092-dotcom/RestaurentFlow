import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { mergeItems } from '../../../utils/mergeBill';

const OrderConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderItems, 
  tableNumber, 
  isUrgent, 
  waiterName = "John Doe" 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group items by base name for display, combining half and full portions
  const displayGroups = {};
  (orderItems || []).forEach(item => {
    const baseName = (item.name || '').trim();
    if (!baseName) return;
    const isHalf = item?.portion === 'half';
    const qty = Number(item.quantity || 0);
    if (!displayGroups[baseName]) {
      displayGroups[baseName] = {
        name: baseName,
        halfQuantity: 0,
        fullQuantity: 0,
        halfItems: [],
        fullItems: [],
        totalPrice: 0
      };
    }
    if (isHalf) {
      displayGroups[baseName].halfQuantity += qty;
      displayGroups[baseName].halfItems.push(item);
    } else {
      displayGroups[baseName].fullQuantity += qty;
      displayGroups[baseName].fullItems.push(item);
    }
    displayGroups[baseName].totalPrice += (Number(item.price || 0) * qty);
  });
  const groupedItems = Object.values(displayGroups);
  const subtotal = groupedItems?.reduce((sum, group) => sum + group.totalPrice, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const estimatedTime = Math.max(...(groupedItems?.map(group => (group.fullItems[0]?.prepTime || group.halfItems[0]?.prepTime || 15)) || [15]));

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onConfirm();
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-overlay">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-subtle" onClick={!isSubmitting ? onClose : undefined} />
      <div className="absolute inset-4 bg-card rounded-lg shadow-modal overflow-hidden md:relative md:max-w-lg md:mx-auto md:mt-20 md:inset-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Confirm Order</h3>
            <p className="text-sm text-muted-foreground">Review before submitting</p>
          </div>
          {!isSubmitting && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Order Details */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Icon name="Users" size={20} color="white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Table {tableNumber}</p>
                  <p className="text-xs text-muted-foreground">Waiter: {waiterName}</p>
                </div>
              </div>
              
              {isUrgent && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-error/10 rounded-full">
                  <Icon name="AlertTriangle" size={14} className="text-error" />
                  <span className="text-xs font-medium text-error">Urgent Order</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Icon name="Clock" size={14} />
                <span>~{estimatedTime} mins</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="ShoppingCart" size={14} />
                <span>{orderItems?.length} items</span>
              </div>
              <div className="flex items-center space-x-1">
                <Icon name="Calendar" size={14} />
                <span>{new Date()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">Order Items</h4>
            <div className="space-y-3">
              {groupedItems?.map((group, index) => {
                const hasHalf = group.halfQuantity > 0;
                const hasFull = group.fullQuantity > 0;
                const displayQuantity = hasHalf && hasFull
                  ? `${group.fullQuantity}+½`
                  : hasHalf
                    ? '½'
                    : group.fullQuantity;
                return (
                  <div key={`${group.name}-${index}`} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{group.name}</span>
                        <span className="text-xs text-muted-foreground">×({displayQuantity})</span>
                      </div>
                      {/* Show special request for first item if present */}
                      {group.fullItems[0]?.specialRequest && (
                        <p className="text-xs text-muted-foreground italic">"{group.fullItems[0]?.specialRequest}"</p>
                      )}
                      {group.halfItems[0]?.specialRequest && !group.fullItems[0]?.specialRequest && (
                        <p className="text-xs text-muted-foreground italic">"{group.halfItems[0]?.specialRequest}"</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      ₹{group.totalPrice.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">${subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span className="text-foreground">${tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
                <span className="text-foreground">Total</span>
                <span className="text-primary">${total?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-border">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Back to Edit
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              loading={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Order'}
            </Button>
          </div>
          
          {isSubmitting && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Sending order to kitchen...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;