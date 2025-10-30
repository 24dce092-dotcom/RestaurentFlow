import React, { useState } from 'react';
import Icon from '../AppIcon';
import Button from './Button';

export default function Header({ userRole = 'waiter', onToggleSidebar }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Always force waiter role if running in waiter desktop app (window.__IS_WAITER)
  const isWaiterDesktop = typeof window !== 'undefined' && window.__IS_WAITER === true;
  // Prefer explicit userRole prop when present; add runtime detection via window.__APP_ROLE or hash-based hints
  const hasExplicitRole = typeof userRole === 'string' && userRole.length > 0 && userRole !== 'waiter';
  // Runtime role hints: window.__APP_ROLE set by desktop wrapper, or hash/path includes owner keyword
  const runtimeRoleHint = (typeof window !== 'undefined') ? (window.__APP_ROLE || null) : null;
  const hashSuggestsOwner = (typeof window !== 'undefined' && window.location && (window.location.hash || window.location.pathname))
    ? ((window.location.hash && window.location.hash.includes('owner-live-order-dashboard')) || (window.location.pathname && window.location.pathname.includes('owner-live-order-dashboard')))
    : false;
  const isWaiterBuild = typeof import.meta !== 'undefined' && (import.meta.env && (import.meta.env.VITE_TARGET || '').toLowerCase() === 'waiter');
  const isWaiterRuntime = typeof window !== 'undefined' && (
    (window.location && window.location.protocol === 'file:') ||
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().includes('webview'))
  );
  // If running in waiter desktop, always use waiter role
  const inferredRole = isWaiterDesktop ? 'waiter' : (hasExplicitRole ? userRole : (runtimeRoleHint || (hashSuggestsOwner ? 'owner' : null)));
  const isWaiter = inferredRole ? (inferredRole === 'waiter') : (isWaiterBuild || isWaiterRuntime);

  const waiterItems = [
    { label: 'Orders', path: '/waiter-order-taking', icon: 'ClipboardList' },
    { label: 'Tables', path: '/table-management-history', icon: 'Users' }
  ];

  const ownerItems = [
    { label: 'Orders', path: '/owner-live-order-dashboard', icon: 'Monitor' },
    { label: 'Tables', path: '/table-management-history', icon: 'Users' },
    { label: 'Billing', path: '/billing-payment-management', icon: 'CreditCard' },
    { label: 'Analytics', path: '/analytics-reporting-dashboard', icon: 'BarChart3' }
  ];

  // Choose navigation items based on inferred role (explicit prop or runtime hint)
  const navigationItems = (inferredRole && (inferredRole === 'owner' || inferredRole === 'manager')) ? ownerItems : waiterItems;

  const handleNavigation = (path) => {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
        // running as a packaged desktop app - use hash routing so the SPA handles navigation
        const hashPath = path.startsWith('/') ? path : '/' + path;
        window.location.hash = hashPath;
        window.dispatchEvent(new PopStateEvent('popstate'));
        setIsMobileMenuOpen(false);
        return;
      }

      const url = new URL(path, window.location.href);
      if (url.origin === window.location.origin) {
        window.history.pushState({}, '', url.pathname + url.search + url.hash);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        window.location.href = path;
      }
    } catch (e) {
      window.location.href = path;
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-navigation bg-card border-b border-border shadow-subtle">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center space-x-4">
          {onToggleSidebar && (
            <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden">
              <Icon name="Menu" size={20} />
            </Button>
          )}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block">
              <h1 className="text-xl font-semibold text-foreground">RestaurantFlow</h1>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          {navigationItems.map(item => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="relative flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth min-h-touch"
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(v => !v)}>
            <Icon name={isMobileMenuOpen ? 'X' : 'Menu'} size={20} />
          </Button>
        </div>

        <div className="hidden md:flex items-center space-x-2">
          {!isWaiter && (userRole === 'owner' || userRole === 'manager') && (
            <Button variant="ghost" size="icon" onClick={() => handleNavigation('/settings')} className="text-muted-foreground hover:text-foreground">
              <Icon name="Settings" size={18} />
            </Button>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-overlay">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-subtle" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative bg-card border-b border-border shadow-modal">
            <nav className="px-4 py-4 space-y-2">
              {navigationItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="relative flex items-center space-x-3 w-full px-4 py-3 rounded-md text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth min-h-touch"
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}