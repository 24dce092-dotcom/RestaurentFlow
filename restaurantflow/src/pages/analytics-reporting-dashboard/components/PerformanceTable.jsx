import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PerformanceTable = ({ data, type = 'best', loading = false }) => {
  const [sortField, setSortField] = useState('revenue');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data]?.sort((a, b) => {
    let aValue = a?.[sortField];
    let bValue = b?.[sortField];
    
    if (sortField === 'trend') {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  const paginatedData = sortedData?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedData?.length / itemsPerPage);

  const getSortIcon = (field) => {
    if (sortField !== field) return 'ArrowUpDown';
    return sortDirection === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const getTrendIcon = (trend) => {
    const value = parseFloat(trend);
    if (value > 0) return { icon: 'TrendingUp', color: 'text-success' };
    if (value < 0) return { icon: 'TrendingDown', color: 'text-error' };
    return { icon: 'Minus', color: 'text-muted-foreground' };
  };

  const getPerformanceColor = (index) => {
    if (type === 'best') {
      if (index === 0) return 'text-yellow-600'; // Gold
      if (index === 1) return 'text-gray-500'; // Silver
      if (index === 2) return 'text-amber-600'; // Bronze
    }
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-48 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)]?.map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">
            {type === 'best' ? 'Best' : 'Worst'} Performing Dishes
          </h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" iconName="Download">
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Rank
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                  >
                    <span>Dish Name</span>
                    <Icon name={getSortIcon('name')} size={14} />
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  <button
                    onClick={() => handleSort('quantity')}
                    className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                  >
                    <span>Orders</span>
                    <Icon name={getSortIcon('quantity')} size={14} />
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  <button
                    onClick={() => handleSort('revenue')}
                    className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                  >
                    <span>Revenue</span>
                    <Icon name={getSortIcon('revenue')} size={14} />
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  <button
                    onClick={() => handleSort('trend')}
                    className="flex items-center space-x-1 hover:text-foreground transition-smooth"
                  >
                    <span>Trend</span>
                    <Icon name={getSortIcon('trend')} size={14} />
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData?.map((item, index) => {
                const actualIndex = (currentPage - 1) * itemsPerPage + index;
                const trendData = getTrendIcon(item?.trend);
                
                return (
                  <tr key={item?.id} className="border-b border-border hover:bg-muted/50 transition-smooth">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${getPerformanceColor(actualIndex)}`}>
                          #{actualIndex + 1}
                        </span>
                        {actualIndex < 3 && type === 'best' && (
                          <Icon 
                            name="Award" 
                            size={16} 
                            className={getPerformanceColor(actualIndex)} 
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                          <Icon name="UtensilsCrossed" size={16} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item?.name}</p>
                          <p className="text-sm text-muted-foreground">${item?.price}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground">{item?.quantity}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground">
                        ${item?.revenue?.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <Icon name={trendData?.icon} size={14} className={trendData?.color} />
                        <span className={`text-sm font-medium ${trendData?.color}`}>
                          {item?.trend}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        {item?.category}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, sortedData?.length)} of{' '}
              {sortedData?.length} results
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                iconName="ChevronLeft"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                iconName="ChevronRight"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTable;