import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import { shouldSimulate } from '../../utils/autoSim';

const RoleBasedNavigation = ({ userRole = 'waiter', currentPath = '/' }) => {
  const [orderCount, setOrderCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);
  const [urgentOrders, setUrgentOrders] = useState(0);

  useEffect(() => {
    if (!shouldSimulate()) return undefined;
    const interval = setInterval(() => {
      setOrderCount(Math.floor(Math.random() * 15) + 1);
      setTableCount(Math.floor(Math.random() * 8) + 2);
      setUrgentOrders(Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const navigationConfig = {
    waiter: [
      {
        label: 'Take Orders',
        path: '/waiter-order-taking',
        icon: 'ClipboardList',
        badge: orderCount > 0 ? orderCount : null,
        badgeColor: urgentOrders > 0 ? 'bg-error' : 'bg-accent',
        description: 'New orders and modifications'
      },
      {
        label: 'Tables',
        path: '/table-management-history',
        icon: 'Users',
        badge: tableCount > 0 ? tableCount : null,
        badgeColor: 'bg-warning',
        description: 'Table status and history'
      }
    ],
    owner: [
      {
        label: 'Live Dashboard',
        path: '/owner-live-order-dashboard',
        icon: 'Monitor',
        badge: orderCount > 0 ? orderCount : null,
        badgeColor: urgentOrders > 0 ? 'bg-error' : 'bg-accent',
        description: 'Real-time order monitoring'
      },
      {
        label: 'Tables',
        path: '/table-management-history',
        icon: 'Users',
        badge: tableCount > 0 ? tableCount : null,
        badgeColor: 'bg-warning',
        description: 'Table management'
      },
      {
        label: 'Billing',
        path: '/billing-payment-management',
        icon: 'CreditCard',
        badge: null,
        badgeColor: null,
        description: 'Payment processing'
      },
      {
        label: 'Analytics',
        path: '/analytics-reporting-dashboard',
        icon: 'BarChart3',
        badge: null,
        badgeColor: null,
        description: 'Business insights'
      }
    ],
    manager: [
      {
        label: 'Orders',
        path: '/owner-live-order-dashboard',
        icon: 'ClipboardList',
        badge: orderCount > 0 ? orderCount : null,
        badgeColor: urgentOrders > 0 ? 'bg-error' : 'bg-accent',
        description: 'Order oversight'
      },
      {
        label: 'Tables',
        path: '/table-management-history',
        icon: 'Users',
        badge: tableCount > 0 ? tableCount : null,
        badgeColor: 'bg-warning',
        description: 'Table coordination'
      },
      {
        label: 'Billing',
        path: '/billing-payment-management',
        icon: 'CreditCard',
        badge: null,
        badgeColor: null,
        description: 'Payment oversight'
      }
    ]
  };

  const currentNavItems = navigationConfig?.[userRole] || navigationConfig?.waiter;

  const handleNavigation = (path) => {
    if (typeof window === 'undefined') return;
    // When the app is loaded from a file:// URL (packaged desktop app), the SPA uses hash routing.
    // In that case update the hash (e.g. #/owner-live-order-dashboard).
    if (window.location.protocol === 'file:') {
      const hashPath = path.startsWith('/') ? path : '/' + path;
      // Setting location.hash navigates the SPA router when using hash-based routing
      window.location.hash = hashPath;
      // also dispatch a popstate in case some routers listen for it
      try { window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
      return;
    }

    // For normal http(s) served SPA, use history.pushState where possible to avoid full reload
    try {
      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', path);
        // Notify any router listeners
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
    } catch (e) {}

    // Fallback
    window.location.href = path;
  };

  const isActivePath = (path) => {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      const currentHash = window.location.hash ? window.location.hash.replace(/^#/, '') : '/';
      return currentHash === path;
    }
    // Prefer explicit currentPath prop if provided (from router), else fall back to pathname
    const active = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
    return active === path;
  };

  return (
    <nav className="flex items-center space-x-1">
      {currentNavItems?.map((item) => (
        <button
          key={item?.path}
          onClick={() => handleNavigation(item?.path)}
          className={`relative flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth min-h-touch ${
            isActivePath(item?.path)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title={item?.description}
        >
          <Icon name={item?.icon} size={18} />
          <span className="hidden lg:inline">{item?.label}</span>
          
          {item?.badge && (
            <span className={`absolute -top-1 -right-1 ${item?.badgeColor} text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 font-medium`}>
              {item?.badge}
            </span>
          )}
          
          {urgentOrders > 0 && item?.path?.includes('order') && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full animate-pulse" />
          )}
        </button>
      ))}
    </nav>
  );
};

export default RoleBasedNavigation;