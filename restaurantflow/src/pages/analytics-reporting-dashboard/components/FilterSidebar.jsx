import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const FilterSidebar = ({ isOpen, onClose, filters, onFiltersChange, onExport }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'appetizers', label: 'Appetizers' },
    { value: 'mains', label: 'Main Courses' },
    { value: 'desserts', label: 'Desserts' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'specials', label: 'Daily Specials' }
  ];

  const comparisonOptions = [
    { value: 'none', label: 'No Comparison' },
    { value: 'previousPeriod', label: 'Previous Period' },
    { value: 'lastYear', label: 'Same Period Last Year' },
    { value: 'lastMonth', label: 'Same Period Last Month' }
  ];

  const handleFilterChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const resetFilters = () => {
    const defaultFilters = {
      dateRange: 'last7days',
      startDate: '',
      endDate: '',
      category: 'all',
      comparison: 'previousPeriod',
      minRevenue: '',
      maxRevenue: '',
      minOrders: '',
      maxOrders: ''
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const exportOptions = [
    { value: 'pdf', label: 'PDF Report', icon: 'FileText' },
    { value: 'excel', label: 'Excel Spreadsheet', icon: 'FileSpreadsheet' },
    { value: 'csv', label: 'CSV Data', icon: 'Database' }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-overlay lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-subtle" onClick={onClose} />
        </div>
      )}
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-card border-r border-border shadow-modal z-overlay transform transition-transform duration-300 lg:relative lg:transform-none lg:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Filters & Export</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Filters Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Date Range
              </label>
              <div className="space-y-2">
                {dateRangeOptions?.map((option) => (
                  <label key={option?.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dateRange"
                      value={option?.value}
                      checked={localFilters?.dateRange === option?.value}
                      onChange={(e) => handleFilterChange('dateRange', e?.target?.value)}
                      className="w-4 h-4 text-primary border-border focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{option?.label}</span>
                  </label>
                ))}
              </div>

              {/* Custom Date Range */}
              {localFilters?.dateRange === 'custom' && (
                <div className="mt-4 space-y-3">
                  <Input
                    type="date"
                    label="Start Date"
                    value={localFilters?.startDate}
                    onChange={(e) => handleFilterChange('startDate', e?.target?.value)}
                  />
                  <Input
                    type="date"
                    label="End Date"
                    value={localFilters?.endDate}
                    onChange={(e) => handleFilterChange('endDate', e?.target?.value)}
                  />
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Dish Category
              </label>
              <div className="space-y-2">
                {categoryOptions?.map((option) => (
                  <label key={option?.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={option?.value}
                      checked={localFilters?.category === option?.value}
                      onChange={(e) => handleFilterChange('category', e?.target?.value)}
                      className="w-4 h-4 text-primary border-border focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{option?.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Comparison Period */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Compare With
              </label>
              <div className="space-y-2">
                {comparisonOptions?.map((option) => (
                  <label key={option?.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="comparison"
                      value={option?.value}
                      checked={localFilters?.comparison === option?.value}
                      onChange={(e) => handleFilterChange('comparison', e?.target?.value)}
                      className="w-4 h-4 text-primary border-border focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{option?.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Revenue Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Revenue Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min $"
                  value={localFilters?.minRevenue}
                  onChange={(e) => handleFilterChange('minRevenue', e?.target?.value)}
                />
                <Input
                  type="number"
                  placeholder="Max $"
                  value={localFilters?.maxRevenue}
                  onChange={(e) => handleFilterChange('maxRevenue', e?.target?.value)}
                />
              </div>
            </div>

            {/* Order Count Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Order Count Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min orders"
                  value={localFilters?.minOrders}
                  onChange={(e) => handleFilterChange('minOrders', e?.target?.value)}
                />
                <Input
                  type="number"
                  placeholder="Max orders"
                  value={localFilters?.maxOrders}
                  onChange={(e) => handleFilterChange('maxOrders', e?.target?.value)}
                />
              </div>
            </div>

            {/* Export Options */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Export Data
              </label>
              <div className="space-y-2">
                {exportOptions?.map((option) => (
                  <Button
                    key={option?.value}
                    variant="outline"
                    onClick={() => onExport(option?.value)}
                    iconName={option?.icon}
                    iconPosition="left"
                    className="w-full justify-start"
                  >
                    {option?.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border space-y-3">
            <Button onClick={applyFilters} className="w-full">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={resetFilters} className="w-full">
              Reset All
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;