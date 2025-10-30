import React, { useState } from 'react';
import api from '../../../utils/api';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TableActions = ({ selectedTable, userRole = 'waiter', onActionComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);

  const handleAction = async (actionType) => {
    setIsProcessing(true);
    let newStatus = null;
  if (actionType === 'mark-available') newStatus = 'available';
    if (actionType === 'mark-cleaning') newStatus = 'cleaning';
    if (actionType === 'reserve-table') newStatus = 'reserved';
    if (actionType === 'cancel-reserve-table') newStatus = 'available';
    if (actionType === 'generate-bill') newStatus = 'billing';
  if (actionType === 'print-bill') newStatus = 'cleaning';

    if (actionType === 'take-order') {
      setIsProcessing(false);
      setShowConfirmDialog(null);
      if (onActionComplete) {
        onActionComplete('take-order', selectedTable);
      } else {
        alert('Order flow not implemented. Please connect order creation logic.');
      }
      return;
    }

    try {
      if (newStatus) {
  await api.put(`/tables/${selectedTable._id}`, {
          status: newStatus
        });
      }
      setIsProcessing(false);
      setShowConfirmDialog(null);
      if (onActionComplete) {
        onActionComplete(actionType, { ...selectedTable, status: newStatus || selectedTable.status });
      }
    } catch (e) {
      setIsProcessing(false);
      setShowConfirmDialog(null);
      alert('Failed to update table');
    }
  };

  const confirmAction = (actionType) => {
    setShowConfirmDialog(actionType);
  };

  const getActionsForRole = () => {
    const baseActions = [
      {
        id: 'view-current-orders',
        label: 'View Current Orders',
        icon: 'ClipboardList',
        variant: 'default',
        description: 'See active orders for this table',
        requiresConfirm: false,
        availableFor: ['waiter', 'owner', 'manager'],
        availableWhen: ['occupied', 'billing']
      },
      {
        id: 'take-order',
        label: 'Take New Order',
        icon: 'Plus',
        variant: 'default',
        description: 'Add items to current order',
        requiresConfirm: false,
        availableFor: ['waiter'],
        availableWhen: ['occupied', 'available']
      },
      {
        id: 'print-bill',
        label: 'Print Bill',
        icon: 'Printer',
        variant: 'outline',
        description: 'Print existing bill',
        requiresConfirm: false,
        availableFor: ['waiter', 'owner', 'manager'],
        availableWhen: ['billing']
      },
      {
        id: 'mark-available',
        label: 'Mark Available',
        icon: 'CheckCircle',
        variant: 'success',
        description: 'Clear table and mark as available',
        requiresConfirm: true,
        availableFor: ['waiter', 'owner', 'manager'],
        availableWhen: ['billing', 'cleaning']
      },
      {
        id: 'mark-cleaning',
        label: 'Mark for Cleaning',
        icon: 'Sparkles',
        variant: 'outline',
        description: 'Mark table as needs cleaning',
        requiresConfirm: false,
        availableFor: ['waiter', 'owner', 'manager'],
        availableWhen: ['available', 'occupied']
      },
      {
        id: 'reserve-table',
        label: 'Reserve Table',
        icon: 'Clock',
        variant: 'secondary',
        description: 'Reserve table for future booking',
        requiresConfirm: false,
        availableFor: ['waiter', 'owner', 'manager'],
        availableWhen: ['available']
      },
      {
        id: 'cancel-reserve-table',
        label: 'Cancel Reserve Table',
        icon: 'XCircle',
        variant: 'destructive',
        description: 'Cancel reservation and make table available',
        requiresConfirm: true,
        availableFor: ['waiter', 'owner', 'manager'],
        availableWhen: ['reserved']
      },
      
      // Removed: generate-bill, split-bill, request-manager - not required
    ];

    return baseActions?.filter(action => 
      action?.availableFor?.includes(userRole) &&
      (!selectedTable || action?.availableWhen?.includes(selectedTable?.status))
    );
  };

  const availableActions = getActionsForRole();

  const getConfirmMessage = (actionType) => {
    const messages = {
      'mark-available': `Mark Table ${selectedTable?.number} as available? This will clear all current data and reset the table.`,
      'cancel-reserve-table': `Cancel reservation for Table ${selectedTable?.number}? This will make the table available immediately.`
    };
    return messages?.[actionType] || `Are you sure you want to perform this action?`;
  };

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon name="MousePointer" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Table</h3>
          <p className="text-muted-foreground">
            Choose a table to see available actions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Icon name="Settings" size={20} className="text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Table {selectedTable?.number} Actions
            </h2>
            <p className="text-sm text-muted-foreground">
              Status: {selectedTable?.status?.replace('-', ' ')?.replace(/\b\w/g, l => l?.toUpperCase())}
            </p>
          </div>
        </div>
      </div>
      {/* Table Info */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Capacity:</span>
              <span className="ml-2 font-medium">{selectedTable?.capacity}</span>
          </div>
          {selectedTable?.guestCount > 0 && (
            <div>
              <span className="text-muted-foreground">Current Guests:</span>
              <span className="ml-2 font-medium">{selectedTable?.guestCount}</span>
            </div>
          )}
          {/* Order Value and Service Time intentionally removed per UX - keep Capacity and Current Guests only */}
          {selectedTable?.waiterName && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Assigned Waiter:</span>
              <span className="ml-2 font-medium">{selectedTable?.waiterName}</span>
            </div>
          )}
        </div>
      </div>
      {/* Actions */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {availableActions?.map((action) => (
            <Button
              key={action?.id}
              variant={action?.variant}
              fullWidth
              disabled={isProcessing}
              loading={isProcessing && showConfirmDialog === action?.id}
              onClick={() => action?.requiresConfirm ? confirmAction(action?.id) : handleAction(action?.id)}
              className="justify-start h-auto p-4"
            >
              <div className="flex items-start space-x-3 w-full">
                <Icon name={action?.icon} size={20} className="mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{action?.label}</div>
                  <div className="text-xs opacity-80 mt-1">{action?.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {availableActions?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Ban" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Actions Available</h3>
            <p className="text-muted-foreground">
              No actions are available for this table's current status.
            </p>
          </div>
        )}
      </div>
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-overlay flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-subtle" onClick={() => setShowConfirmDialog(null)} />
          <div className="relative bg-card border border-border rounded-lg shadow-modal max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                  <Icon name="AlertTriangle" size={20} className="text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Confirm Action</h3>
                  <p className="text-sm text-muted-foreground">This action requires confirmation</p>
                </div>
              </div>
              
              <p className="text-foreground mb-6">
                {getConfirmMessage(showConfirmDialog)}
              </p>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowConfirmDialog(null)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  fullWidth
                  loading={isProcessing}
                  onClick={() => handleAction(showConfirmDialog)}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableActions;