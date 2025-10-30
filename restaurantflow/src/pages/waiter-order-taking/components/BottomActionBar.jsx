import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BottomActionBar = ({ 
  orderItems, 
  onSubmitOrder, 
  onSaveDraft, 
  onClearAll, 
  isSubmitting = false,
  className = "" 
}) => {
  const totalItems = orderItems?.reduce((sum, item) => sum + item?.quantity, 0);
  const totalAmount = orderItems?.reduce((sum, item) => sum + (item?.price * item?.quantity), 0);
  const hasItems = orderItems?.length > 0;

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-modal z-navigation ${className}`}>
      <div className="p-4">
        {/* Order Summary */}
        {hasItems && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Icon name="ShoppingCart" size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{totalItems} items</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <span className="text-lg font-bold text-primary">${totalAmount?.toFixed(2)}</span>
            </div>
            
            <button
              onClick={onClearAll}
              disabled={isSubmitting}
              className="text-error hover:text-error/80 transition-smooth p-2"
              title="Clear all items"
            >
              <Icon name="Trash2" size={18} />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {/* Save Draft */}
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={!hasItems || isSubmitting}
            className="flex-1 min-h-touch"
          >
            <Icon name="Save" size={16} className="mr-2" />
            Save Draft
          </Button>

          {/* Submit Order */}
          <Button
            variant="default"
            onClick={onSubmitOrder}
            disabled={!hasItems || isSubmitting}
            loading={isSubmitting}
            className="flex-2 min-h-touch"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Icon name="Send" size={16} className="mr-2" />
                Submit Order
              </>
            )}
          </Button>
        </div>

        {/* Quick Stats */}
        {hasItems && (
          <div className="flex items-center justify-center space-x-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Icon name="Clock" size={12} />
              <span>Est. {Math.max(...orderItems?.map(item => item?.prepTime || 15))} mins</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center space-x-1">
              <Icon name="DollarSign" size={12} />
              <span>Tax: ${(totalAmount * 0.08)?.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
      {/* Safe area for mobile devices */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </div>
  );
};

export default BottomActionBar;