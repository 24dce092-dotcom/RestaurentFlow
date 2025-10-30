import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const FilterPanel = ({ onFiltersChange, activeFilters, statusCounts = {}, tableOptions = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTable, setSelectedTable] = useState('all');
  // Removed waiter and timeRange filters
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Orders', count: statusCounts?.total || 0 },
  // 'Received' represents orders that have been taken and are not yet preparing
  { value: 'received', label: 'Received', count: statusCounts?.pending || 0 },
  { value: 'pending', label: 'Pending', count: statusCounts?.pending || 0 },
    { value: 'preparing', label: 'Preparing', count: statusCounts?.preparing || 0 },
    { value: 'ready', label: 'Ready', count: statusCounts?.ready || 0 },
    { value: 'delivered', label: 'Delivered', count: statusCounts?.delivered || 0 }
  ];

  const builtTableOptions = [
    { value: 'all', label: 'All Tables' },
    ...(tableOptions?.length > 0 ? tableOptions.map(t => ({ value: `table-${t.number || t.tableNumber || t._id || t.id}`, label: `Table ${t.number || t.tableNumber || t._id || t.id}` })) : [] )
  ];

  // Removed waiterOptions and timeRangeOptions

  const handleFilterChange = (filterType, value) => {
    const newFilters = {
      searchTerm,
      status: selectedStatus,
      table: selectedTable,
  // waiter and timeRange removed
      urgentOnly: showUrgentOnly,
      [filterType]: value
    };

    // Update local state
    switch (filterType) {
      case 'searchTerm':
        setSearchTerm(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'table':
        setSelectedTable(value);
        break;
    // waiter and timeRange removed
      case 'urgentOnly':
        setShowUrgentOnly(value);
        break;
    }

    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedTable('all');
  // waiter and timeRange removed
    setShowUrgentOnly(false);
    
    onFiltersChange({
      searchTerm: '',
      status: 'all',
      table: 'all',
  // waiter and timeRange removed
      urgentOnly: false
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedStatus !== 'all') count++;
    if (selectedTable !== 'all') count++;
  // waiter and timeRange removed
    if (showUrgentOnly) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Icon name="Search" size={20} className="mr-2 text-blue-600" />
          Search Orders
        </h3>
        
        <Input
          type="search"
          placeholder="Search by table, item, or order ID..."
          value={searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e?.target?.value)}
          className="w-full"
        />
      </div>
      {/* Quick Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon name="Filter" size={20} className="mr-2 text-blue-600" />
            Filters
          </h3>
          {getActiveFilterCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
            >
              Clear All ({getActiveFilterCount()})
            </Button>
          )}
        </div>

        {/* Urgent Orders Toggle */}
        <div className="mb-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showUrgentOnly}
              onChange={(e) => handleFilterChange('urgentOnly', e?.target?.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <div className="flex items-center space-x-2">
              <Icon name="AlertTriangle" size={16} className="text-red-600" />
              <span className="text-sm font-medium text-gray-700">Urgent Orders Only</span>
            </div>
          </label>
        </div>

        {/* Status Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order Status
          </label>
          <div className="space-y-2">
            {statusOptions?.map((option) => (
              <label key={option?.value} className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="status"
                    value={option?.value}
                    checked={selectedStatus === option?.value}
                    onChange={(e) => handleFilterChange('status', e?.target?.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option?.label}</span>
                </div>
                {option?.count !== undefined && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {option?.count}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Table Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Table Number
          </label>
          <Select
            options={builtTableOptions}
            value={selectedTable}
            onChange={(val) => handleFilterChange('table', val)}
            searchable
            clearable={selectedTable !== 'all'}
          />
        </div>

  {/* Removed Waiter and Time Range Filters */}
      </div>
      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Active Filters</h4>
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => handleFilterChange('searchTerm', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                Status: {statusOptions?.find(s => s?.value === selectedStatus)?.label}
                <button
                  onClick={() => handleFilterChange('status', 'all')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            )}
            {showUrgentOnly && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                Urgent Only
                <button
                  onClick={() => handleFilterChange('urgentOnly', false)}
                  className="ml-1 text-red-600 hover:text-red-800"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;