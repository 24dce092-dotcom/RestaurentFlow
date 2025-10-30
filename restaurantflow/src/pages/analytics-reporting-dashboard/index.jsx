import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import KPICard from './components/KPICard';
import RevenueChart from './components/RevenueChart';
import DishPerformanceChart from './components/DishPerformanceChart';
import PeakHoursChart from './components/PeakHoursChart';
import PerformanceTable from './components/PerformanceTable';
import FilterSidebar from './components/FilterSidebar';

const AnalyticsReportingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [filters, setFilters] = useState({
    dateRange: 'last7days',
    startDate: '',
    endDate: '',
    category: 'all',
    comparison: 'previousPeriod',
    minRevenue: '',
    maxRevenue: '',
    minOrders: '',
    maxOrders: ''
  });

  // Mock data for KPIs
  const kpiData = [
    {
      title: 'Daily Revenue',
      value: '$12,847',
      change: '+12.5%',
      changeType: 'positive',
      icon: 'DollarSign',
      trend: 75
    },
    {
      title: 'Order Volume',
      value: '342',
      change: '+8.2%',
      changeType: 'positive',
      icon: 'ShoppingCart',
      trend: 68
    },
    {
      title: 'Average Ticket',
      value: '$37.58',
      change: '+4.1%',
      changeType: 'positive',
      icon: 'Receipt',
      trend: 82
    },
    {
      title: 'Table Turnover',
      value: '3.2x',
      change: '-2.3%',
      changeType: 'negative',
      icon: 'RotateCcw',
      trend: 45
    }
  ];

  // Mock revenue trend data
  const revenueData = [
    { date: '2025-08-19', revenue: 8500, orders: 185 },
    { date: '2025-08-20', revenue: 9200, orders: 201 },
    { date: '2025-08-21', revenue: 11800, orders: 267 },
    { date: '2025-08-22', revenue: 13200, orders: 298 },
    { date: '2025-08-23', revenue: 15600, orders: 342 },
    { date: '2025-08-24', revenue: 14200, orders: 315 },
    { date: '2025-08-25', revenue: 12800, orders: 289 },
    { date: '2025-08-26', revenue: 12847, orders: 342 }
  ];

  // Mock dish performance data
  const dishPerformanceData = [
    { name: 'Grilled Salmon', revenue: 2850, quantity: 95, category: 'mains' },
    { name: 'Caesar Salad', revenue: 1680, quantity: 120, category: 'appetizers' },
    { name: 'Ribeye Steak', revenue: 3200, quantity: 64, category: 'mains' },
    { name: 'Chocolate Cake', revenue: 980, quantity: 98, category: 'desserts' },
    { name: 'Margherita Pizza', revenue: 1450, quantity: 87, category: 'mains' },
    { name: 'Craft Beer', revenue: 720, quantity: 144, category: 'beverages' },
    { name: 'Lobster Bisque', revenue: 1120, quantity: 56, category: 'appetizers' },
    { name: 'Tiramisu', revenue: 650, quantity: 65, category: 'desserts' }
  ];

  // Mock peak hours data
  const peakHoursData = [
    { hour: 11, orders: 12, revenue: 450 },
    { hour: 12, orders: 28, revenue: 1050 },
    { hour: 13, orders: 35, revenue: 1320 },
    { hour: 14, orders: 22, revenue: 830 },
    { hour: 15, orders: 8, revenue: 300 },
    { hour: 16, orders: 5, revenue: 180 },
    { hour: 17, orders: 15, revenue: 580 },
    { hour: 18, orders: 42, revenue: 1680 },
    { hour: 19, orders: 58, revenue: 2320 },
    { hour: 20, orders: 65, revenue: 2600 },
    { hour: 21, orders: 48, revenue: 1920 },
    { hour: 22, orders: 25, revenue: 1000 },
    { hour: 23, orders: 8, revenue: 320 }
  ];

  // Mock performance table data
  const bestPerformingDishes = [
    {
      id: 1,
      name: 'Ribeye Steak',
      price: 45.99,
      quantity: 64,
      revenue: 3200,
      trend: '+15.2',
      category: 'Main Course'
    },
    {
      id: 2,
      name: 'Grilled Salmon',
      price: 32.99,
      quantity: 95,
      revenue: 2850,
      trend: '+12.8',
      category: 'Main Course'
    },
    {
      id: 3,
      name: 'Caesar Salad',
      price: 14.99,
      quantity: 120,
      revenue: 1680,
      trend: '+8.5',
      category: 'Appetizer'
    },
    {
      id: 4,
      name: 'Margherita Pizza',
      price: 18.99,
      quantity: 87,
      revenue: 1450,
      trend: '+6.2',
      category: 'Main Course'
    },
    {
      id: 5,
      name: 'Lobster Bisque',
      price: 22.99,
      quantity: 56,
      revenue: 1120,
      trend: '+4.1',
      category: 'Appetizer'
    }
  ];

  const worstPerformingDishes = [
    {
      id: 6,
      name: 'Vegetable Curry',
      price: 16.99,
      quantity: 12,
      revenue: 204,
      trend: '-18.5',
      category: 'Main Course'
    },
    {
      id: 7,
      name: 'Fish Tacos',
      price: 19.99,
      quantity: 8,
      revenue: 160,
      trend: '-22.3',
      category: 'Main Course'
    },
    {
      id: 8,
      name: 'Quinoa Bowl',
      price: 15.99,
      quantity: 15,
      revenue: 240,
      trend: '-15.7',
      category: 'Main Course'
    },
    {
      id: 9,
      name: 'Mushroom Risotto',
      price: 24.99,
      quantity: 18,
      revenue: 450,
      trend: '-12.4',
      category: 'Main Course'
    },
    {
      id: 10,
      name: 'Caprese Salad',
      price: 12.99,
      quantity: 22,
      revenue: 286,
      trend: '-8.9',
      category: 'Appetizer'
    }
  ];

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleExport = (format) => {
    console.log(`Exporting data in ${format} format`);
    // Simulate export process
    alert(`Exporting analytics report as ${format?.toUpperCase()}...`);
  };

  const periodOptions = [
    { value: 'day', label: 'Daily' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="owner" />
      <div className="flex">
        {/* Filter Sidebar */}
        <FilterSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onExport={handleExport}
        />

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-6 pt-20">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
                <p className="text-muted-foreground">
                  Comprehensive business intelligence and performance metrics
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Period Selector */}
                <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
                  {periodOptions?.map((option) => (
                    <Button
                      key={option?.value}
                      variant={selectedPeriod === option?.value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedPeriod(option?.value)}
                      className="h-8 px-3"
                    >
                      {option?.label}
                    </Button>
                  ))}
                </div>

                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setSidebarOpen(true)}
                  iconName="Filter"
                  iconPosition="left"
                  className="lg:hidden"
                >
                  Filters
                </Button>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  onClick={() => window.location?.reload()}
                  iconName="RefreshCw"
                  iconPosition="left"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {kpiData?.map((kpi, index) => (
                <KPICard
                  key={index}
                  title={kpi?.title}
                  value={kpi?.value}
                  change={kpi?.change}
                  changeType={kpi?.changeType}
                  icon={kpi?.icon}
                  trend={kpi?.trend}
                  loading={loading}
                />
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="lg:col-span-2">
                <RevenueChart data={revenueData} period={selectedPeriod} loading={loading} />
              </div>
              
              <DishPerformanceChart data={dishPerformanceData} loading={loading} />
              <PeakHoursChart data={peakHoursData} loading={loading} />
            </div>

            {/* Performance Tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <PerformanceTable 
                data={bestPerformingDishes} 
                type="best" 
                loading={loading} 
              />
              <PerformanceTable 
                data={worstPerformingDishes} 
                type="worst" 
                loading={loading} 
              />
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                    <Icon name="TrendingUp" size={20} className="text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Growth Rate</h3>
                    <p className="text-sm text-muted-foreground">Week over week</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-success">+12.5%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Revenue increased by $1,420 compared to last week
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                    <Icon name="Clock" size={20} className="text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Avg Order Time</h3>
                    <p className="text-sm text-muted-foreground">Kitchen to table</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">18 min</p>
                <p className="text-sm text-muted-foreground mt-1">
                  2 minutes faster than last week
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon name="Users" size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Customer Satisfaction</h3>
                    <p className="text-sm text-muted-foreground">Average rating</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">4.8/5</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on 156 reviews this week
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsReportingDashboard;