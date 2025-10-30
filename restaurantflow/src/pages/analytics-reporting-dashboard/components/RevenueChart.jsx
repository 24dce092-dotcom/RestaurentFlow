import React from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const RevenueChart = ({ data, period = 'daily', loading = false }) => {
  const formatTooltipValue = (value, name) => {
    if (name === 'revenue') {
      return [`$${value?.toLocaleString()}`, 'Revenue'];
    }
    return [value, name];
  };

  const formatXAxisLabel = (tickItem) => {
    if (period === 'daily') {
      return new Date(tickItem)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (period === 'weekly') {
      return `Week ${tickItem}`;
    }
    return new Date(tickItem)?.toLocaleDateString('en-US', { month: 'short' });
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-6"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Revenue Trends</h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span className="text-sm text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-secondary rounded-full"></div>
            <span className="text-sm text-muted-foreground">Orders</span>
          </div>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(30, 58, 138)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="rgb(30, 58, 138)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(245, 158, 11)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="rgb(245, 158, 11)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxisLabel}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              yAxisId="revenue"
              orientation="left"
              tickFormatter={(value) => `$${(value / 1000)?.toFixed(0)}k`}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              yAxisId="orders"
              orientation="right"
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => formatXAxisLabel(label)}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke="rgb(30, 58, 138)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
            <Line
              yAxisId="orders"
              type="monotone"
              dataKey="orders"
              stroke="rgb(245, 158, 11)"
              strokeWidth={2}
              dot={{ fill: 'rgb(245, 158, 11)', strokeWidth: 2, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;