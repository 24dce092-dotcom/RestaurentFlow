import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import Button from '../../../components/ui/Button';

const DishPerformanceChart = ({ data, loading = false }) => {
  const [viewType, setViewType] = useState('bar'); // 'bar' or 'pie'
  const [sortBy, setSortBy] = useState('revenue'); // 'revenue' or 'quantity'

  const COLORS = ['#1e3a8a', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'];

  const sortedData = [...data]?.sort((a, b) => {
    if (sortBy === 'revenue') return b?.revenue - a?.revenue;
    return b?.quantity - a?.quantity;
  })?.slice(0, 8);

  const formatTooltipValue = (value, name) => {
    if (name === 'revenue') {
      return [`$${value?.toLocaleString()}`, 'Revenue'];
    }
    if (name === 'quantity') {
      return [`${value} orders`, 'Quantity'];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 bg-muted rounded w-48"></div>
            <div className="flex space-x-2">
              <div className="h-8 bg-muted rounded w-16"></div>
              <div className="h-8 bg-muted rounded w-16"></div>
            </div>
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <h3 className="text-lg font-semibold text-foreground">Dish Performance</h3>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
            <Button
              variant={sortBy === 'revenue' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('revenue')}
              className="h-7 px-2"
            >
              Revenue
            </Button>
            <Button
              variant={sortBy === 'quantity' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('quantity')}
              className="h-7 px-2"
            >
              Quantity
            </Button>
          </div>
          
          <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
            <Button
              variant={viewType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('bar')}
              iconName="BarChart3"
              className="h-7 w-7 p-0"
            />
            <Button
              variant={viewType === 'pie' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('pie')}
              iconName="PieChart"
              className="h-7 w-7 p-0"
            />
          </div>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {viewType === 'bar' ? (
            <BarChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tickFormatter={(value) => sortBy === 'revenue' ? `$${value}` : value}
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey={sortBy} 
                fill="rgb(30, 58, 138)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={sortedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100)?.toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey={sortBy}
              >
                {sortedData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS?.[index % COLORS?.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      {/* Legend for Pie Chart */}
      {viewType === 'pie' && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sortedData?.slice(0, 8)?.map((item, index) => (
            <div key={item?.name} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS?.[index % COLORS?.length] }}
              />
              <span className="text-xs text-muted-foreground truncate">{item?.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DishPerformanceChart;