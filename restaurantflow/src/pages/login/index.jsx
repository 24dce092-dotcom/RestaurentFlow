import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SecurityBadges from './components/SecurityBadges';
import RestaurantLogo from './components/RestaurantLogo';
import MockCredentials from './components/MockCredentials';

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'waiter',
    rememberMe: false
  });

  // Mock credentials for different roles
  const validCredentials = {
    waiter: { email: 'waiter@restaurantflow.com', password: 'waiter123' },
    owner: { email: 'owner@restaurantflow.com', password: 'owner123' },
    manager: { email: 'manager@restaurantflow.com', password: 'manager123' }
  };

  // Role-based navigation mapping
  const roleRoutes = {
    waiter: '/waiter-order-taking',
    owner: '/analytics-reporting-dashboard',
    manager: '/owner-live-order-dashboard'
  };

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('restaurantflow_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      navigate(roleRoutes?.[userData?.role] || '/waiter-order-taking');
    }
  }, [navigate]);

  const handleLogin = async (loginData) => {
    setIsLoading(true);
    setError('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { email, password, role, rememberMe } = loginData;
      const validCreds = validCredentials?.[role];

      // Validate credentials
      if (email !== validCreds?.email) {
        throw new Error('Invalid email address. Please check your credentials.');
      }

      if (password !== validCreds?.password) {
        throw new Error('Invalid password. Please check your credentials.');
      }

      // Successful login
      const userData = {
        email,
        role,
        name: role === 'waiter' ? 'Sarah Johnson' : role === 'owner' ? 'Michael Chen' : 'Emily Rodriguez',
        loginTime: new Date()?.toISOString(),
        permissions: getPermissionsByRole(role)
      };

      // Save user data
      if (rememberMe) {
        localStorage.setItem('restaurantflow_user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('restaurantflow_user', JSON.stringify(userData));
      }

      // Navigate to appropriate dashboard
      navigate(roleRoutes?.[role]);

    } catch (err) {
      setError(err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionsByRole = (role) => {
    const permissions = {
      waiter: ['take_orders', 'view_tables', 'manage_bills'],
      owner: ['full_access', 'analytics', 'staff_management', 'billing', 'reports'],
      manager: ['staff_coordination', 'order_oversight', 'billing', 'table_management']
    };
    return permissions?.[role] || [];
  };

  const handleFillCredentials = (credentials) => {
    setFormData(credentials);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Restaurant Logo */}
          <div className="text-center mb-8">
            <RestaurantLogo size="default" />
          </div>

          {/* Login Card */}
          <div className="bg-card/80 backdrop-blur-subtle rounded-2xl shadow-modal border border-border/50 p-6 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Welcome Back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in to access your restaurant dashboard
              </p>
            </div>

            {/* Login Form */}
            <LoginForm
              onLogin={handleLogin}
              isLoading={isLoading}
              error={error}
            />

            {/* Demo Credentials */}
            <div className="mt-6">
              <MockCredentials
                onFillCredentials={handleFillCredentials}
              />
            </div>
          </div>

          {/* Security Badges */}
          <div className="mt-8">
            <SecurityBadges />
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="relative text-center py-6 px-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            © {new Date()?.getFullYear()} RestaurantFlow. All rights reserved.
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
            <button className="hover:text-foreground transition-smooth">
              Privacy Policy
            </button>
            <span>•</span>
            <button className="hover:text-foreground transition-smooth">
              Terms of Service
            </button>
            <span>•</span>
            <button className="hover:text-foreground transition-smooth" onClick={() => window.location.href = '/server-settings'}>
              Server Settings
            </button>
          </div>
        </div>
      </footer>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-subtle flex items-center justify-center z-overlay">
          <div className="bg-card rounded-lg p-6 shadow-modal border border-border">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-foreground">
                Signing you in...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;