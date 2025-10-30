import React from 'react';
import Icon from '../../../components/AppIcon';
import { mergeItems } from '../../../utils/mergeBill';


const OrderSummaryPanel = ({ 
  orderItems, 
  tableNumber, 
  isUrgent, 
  onToggleUrgent, 
  onUpdateQuantity, 
  onRemoveItem, 
  onAddSpecialRequest,
  className = "" 
}) => {
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
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  return (
    <div className={`bg-card border border-border rounded-lg h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Order Summary</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Table</span>
            <span className="text-sm font-bold text-primary">{tableNumber}</span>
          </div>
        </div>
        
        {/* Urgent Order Toggle */}
        <button
          onClick={onToggleUrgent}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-smooth w-full ${
            isUrgent
              ? 'bg-error text-error-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Icon name={isUrgent ? "AlertTriangle" : "Clock"} size={16} />
          <span className="text-sm font-medium">
            {isUrgent ? 'Urgent Order' : 'Mark as Urgent'}
          </span>
          {isUrgent && (
            <div className="ml-auto w-2 h-2 bg-error-foreground rounded-full animate-pulse" />
          )}
        </button>
      </div>
      {/* Order Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {(orderItems?.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Icon name="ShoppingCart" size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start adding items from the menu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedItems?.map((group, index) => {
              const hasHalf = group.halfQuantity > 0;
              const hasFull = group.fullQuantity > 0;
              const totalQuantity = group.halfQuantity + group.fullQuantity;
              
              // Display quantity like menu card: "½", "2", or "½+2"
              const displayQuantity = hasHalf && hasFull 
                ? `½${hasFull ? `+${group.fullQuantity}` : ''}`
                : hasHalf 
                  ? '½' 
                  : group.fullQuantity;
              
              return (
                <div key={`${group.name}-${index}`} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">{group.name}</h4>
                    {hasHalf && hasFull && (
                      <span className="inline-block text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1 align-middle">Mixed</span>
                    )}
                    {hasHalf && !hasFull && (
                      <span className="inline-block text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-1 align-middle">Half</span>
                    )}
                    <p className="text-xs text-muted-foreground">₹{(group.totalPrice / totalQuantity).toFixed(2)} avg each</p>
                  </div>
                  <button
                    onClick={() => {
                      // Remove all items of this group
                      if (hasHalf) {
                        group.halfItems.forEach(item => {
                          const itemId = item._id || item.id || item.name;
                          const uniqueItemId = `${itemId}-half`;
                          onRemoveItem(uniqueItemId);
                        });
                      }
                      if (hasFull) {
                        group.fullItems.forEach(item => {
                          const itemId = item._id || item.id || item.name;
                          const uniqueItemId = `${itemId}-full`;
                          onRemoveItem(uniqueItemId);
                        });
                      }
                    }}
                    className="text-muted-foreground hover:text-error transition-smooth p-1"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Decrease quantity - prefer full portions first, then half
                        if (hasFull && group.fullQuantity > 0) {
                          const item = group.fullItems[0];
                          const itemId = item._id || item.id || item.name;
                          const uniqueItemId = `${itemId}-full`;
                          onUpdateQuantity(uniqueItemId, Math.max(0, item.quantity - 1));
                        } else if (hasHalf && group.halfQuantity > 0) {
                          const item = group.halfItems[0];
                          const itemId = item._id || item.id || item.name;
                          const uniqueItemId = `${itemId}-half`;
                          onUpdateQuantity(uniqueItemId, Math.max(0, item.quantity - 1));
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-smooth"
                    >
                      <Icon name="Minus" size={12} />
                    </button>
                    <span className="text-sm font-medium text-foreground min-w-[20px] text-center">
                      {displayQuantity}
                    </span>
                    <button
                      onClick={() => {
                        // Increase quantity - prefer full portions
                        if (hasFull) {
                          const item = group.fullItems[0];
                          const itemId = item._id || item.id || item.name;
                          const uniqueItemId = `${itemId}-full`;
                          onUpdateQuantity(uniqueItemId, item.quantity + 1);
                        } else if (hasHalf) {
                          // If only half portions exist, add a full portion
                          const item = group.halfItems[0];
                          const itemId = item._id || item.id || item.name;
                          const uniqueItemId = `${itemId}-full`;
                          onUpdateQuantity(uniqueItemId, 1);
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-smooth"
                    >
                      <Icon name="Plus" size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    ₹{group.totalPrice.toFixed(2)}
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    // Add special request to the first available item
                    const firstItem = hasHalf ? group.halfItems[0] : group.fullItems[0];
                    if (firstItem) {
                      const itemId = firstItem._id || firstItem.id || firstItem.name;
                      const portion = hasHalf && !hasFull ? 'half' : 'full';
                      const uniqueItemId = `${itemId}-${portion}`;
                      onAddSpecialRequest(uniqueItemId);
                    }
                  }}
                  className="mt-2 text-xs text-primary hover:text-primary/80 transition-smooth flex items-center"
                >
                  <Icon name="MessageSquare" size={12} className="mr-1" />
                  Add Special Request
                </button>
              </div>
            );
          })}
          </div>
        )}
      </div>
      {/* Order Total */}
      {orderItems?.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span className="text-foreground">${tax?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
              <span className="text-foreground">Total</span>
              <span className="text-primary">${total?.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            {orderItems?.length} item{orderItems?.length !== 1 ? 's' : ''} • 
            Estimated time: {Math.max(...orderItems?.map(item => item?.prepTime || 15))} mins
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSummaryPanel;