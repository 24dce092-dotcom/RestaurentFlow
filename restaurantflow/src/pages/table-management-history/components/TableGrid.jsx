import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { shouldSimulate } from '../../../utils/autoSim';


const TableGrid = ({ onTableSelect, selectedTableId, userRole = 'waiter', tables = [], loading = false, refreshTables }) => {
  const [editTable, setEditTable] = useState(null);
  const [editStatus, setEditStatus] = useState('available');
  const [editCapacity, setEditCapacity] = useState(2);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const handleEditClick = (table) => {
    setEditTable(table);
    setEditStatus(table.status);
    setEditCapacity(table.capacity);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await api.put(`/tables/${editTable._id}`, {
        status: editStatus,
        capacity: editCapacity
      });
      setEditTable(null);
      if (refreshTables) refreshTables();
    } catch (e) {
      alert('Failed to update table');
    }
    setSaving(false);
  };

  const statusConfig = {
    available: {
      label: 'Available',
      icon: 'Circle',
      borderColor: 'border-success',
      textColor: 'text-success',
      iconColor: 'text-success',
      dotColor: 'bg-success'
    },
    occupied: {
      label: 'Occupied',
      icon: 'Users',
      borderColor: 'border-primary',
      textColor: 'text-primary',
      iconColor: 'text-primary',
      dotColor: 'bg-primary'
    },
    billing: {
      label: 'Billing',
      icon: 'CreditCard',
      borderColor: 'border-warning',
      textColor: 'text-warning',
      iconColor: 'text-warning',
      dotColor: 'bg-warning'
    },
    running: {
      label: 'Running',
      icon: 'Play',
      borderColor: 'border-sky-300',
      textColor: 'text-sky-700',
      iconColor: 'text-sky-700',
      dotColor: 'bg-sky-200'
    },
    cleaning: {
      label: 'Cleaning',
      icon: 'Sparkles',
      borderColor: 'border-muted',
      textColor: 'text-muted-foreground',
      iconColor: 'text-muted-foreground',
      dotColor: 'bg-muted'
    },
    reserved: {
      label: 'Reserved',
      icon: 'Clock',
      borderColor: 'border-secondary',
      textColor: 'text-secondary',
      iconColor: 'text-secondary',
      dotColor: 'bg-secondary'
    },
    'needs-attention': {
      label: 'Needs Attention',
      icon: 'AlertTriangle',
      borderColor: 'border-error',
      textColor: 'text-error',
      iconColor: 'text-error',
      dotColor: 'bg-error'
    }
  };

  const getDisplayStatus = (s) => (s === 'running' ? 'occupied' : s);

  const filteredTables = tables?.filter(table => 
    filterStatus === 'all' || getDisplayStatus(table?.status) === filterStatus
  );

  const statusCounts = tables?.reduce((acc, table) => {
    const st = getDisplayStatus(table?.status);
    acc[st] = (acc?.[st] || 0) + 1;
    return acc;
  }, {});

  const handleTableClick = (table) => {
    onTableSelect(table);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-center py-4 text-muted-foreground">Loading tables...</div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterStatus('all')}
        >
          All Tables ({tables?.length})
        </Button>
        {Object.entries(statusCounts)?.map(([status, count]) => {
          const config = statusConfig?.[status];
          return (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="flex items-center space-x-1"
            >
              <span className={`${config?.dotColor} w-2 h-2 rounded-full inline-block mr-1`} />
              <Icon name={config?.icon} size={14} />
              <span>{config?.label} ({count})</span>
            </Button>
          );
        })}
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {filteredTables?.map((table) => {
          const displayStatus = getDisplayStatus(table?.status);
          const config = statusConfig?.[displayStatus] || statusConfig.available;
          const isSelected = selectedTableId === table?.id;
          const baseBg = 'bg-card';
          const tileClasses = isSelected
            ? 'border-primary bg-primary/5 shadow-md'
            : `${config?.borderColor} ${baseBg}`;

          return (
            <div
              key={table?._id || table?.id}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md min-h-touch cursor-pointer ${tileClasses}`}
              onClick={() => handleTableClick(table)}
            >
              {/* Table Number */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-foreground">
                  {table?.number}
                </span>
                <Icon 
                  name={config?.icon} 
                  size={16} 
                  className={config?.iconColor} 
                />
              </div>

              {/* Status Badge */}
              <div className={`text-xs font-medium ${config?.textColor} mb-2 flex items-center space-x-2`}>
                <span>{config?.label}</span>
                {displayStatus === 'occupied' && table?.hasPendingBill && null}
              </div>

              {/* Table Details */}
              {displayStatus === 'occupied' && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{table?.guestCount}</span>
                  </div>
                    {table?.hasPendingBill ? (
                      <div className="flex items-center justify-start text-xs text-error font-medium mt-1">
                        Unpaid
                      </div>
                    ) : (
                      <div className="flex items-center justify-start text-xs text-muted-foreground mt-1">
                        Running
                      </div>
                    )}
                  {table?.waiterName && (
                    <div className="text-xs text-primary font-medium mt-1">
                      {table?.waiterName?.split(' ')?.[0]}
                    </div>
                  )}
                </div>
              )}

              {table?.status === 'billing' && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Bill:</span>
                    <span className="font-medium">${table?.orderValue}</span>
                  </div>
                </div>
              )}

              {table?.status === 'available' && (
                <div className="text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Capacity:</span>
                    <span className="font-medium">{table?.capacity}</span>
                  </div>
                </div>
              )}

              {/* Attention Indicator */}
              {table?.status === 'needs-attention' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full animate-pulse" />
              )}

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full" />
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editTable && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h2 className="text-lg font-bold mb-4">Edit Table {editTable.number}</h2>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Status</label>
              <select
                className="w-full border border-border rounded px-2 py-1"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
              >
                {Object.keys(statusConfig).map(status => (
                  <option key={status} value={status}>{statusConfig[status].label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Capacity</label>
              <input
                type="number"
                min={1}
                className="w-full border border-border rounded px-2 py-1"
                value={editCapacity}
                onChange={e => setEditCapacity(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded border border-border bg-muted hover:bg-muted/80"
                onClick={() => setEditTable(null)}
                type="button"
                disabled={saving}
              >Cancel</button>
              <button
                className="px-3 py-1 rounded bg-primary text-white hover:bg-primary/90"
                onClick={handleEditSave}
                type="button"
                disabled={saving}
              >{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTables?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No tables found</h3>
          <p className="text-muted-foreground">
            No tables match the selected filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};

export default TableGrid;