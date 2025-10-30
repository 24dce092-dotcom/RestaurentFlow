import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const LoginForm = ({ onLogin, isLoading, error }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'waiter',
    rememberMe: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const roles = [
    { id: 'waiter', label: 'Waiter', icon: 'Users', description: 'Take orders and manage tables' },
    { id: 'owner', label: 'Owner', icon: 'Crown', description: 'Full system access and analytics' },
    { id: 'manager', label: 'Manager', icon: 'Shield', description: 'Staff coordination and oversight' }
  ];

  const validateForm = () => {
    const errors = {};
    
    if (!formData?.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/?.test(formData?.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData?.password) {
      errors.password = 'Password is required';
    } else if (formData?.password?.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (validateForm()) {
      onLogin(formData);
    }
  };

  const handleForgotPassword = () => {
    // In real implementation, this would open a forgot password modal or navigate to reset page
    alert('Forgot password functionality would be implemented here');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      {/* Email Input */}
      <Input
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        value={formData?.email}
        onChange={(e) => handleInputChange('email', e?.target?.value)}
        error={validationErrors?.email || (error && error?.includes('email') ? error : '')}
        required
        disabled={isLoading}
        className="w-full"
      />
      {/* Password Input */}
      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={formData?.password}
          onChange={(e) => handleInputChange('password', e?.target?.value)}
          error={validationErrors?.password || (error && error?.includes('password') ? error : '')}
          required
          disabled={isLoading}
          className="w-full"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-smooth"
          disabled={isLoading}
        >
          <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
        </button>
      </div>
      {/* Role Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Select Role</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {roles?.map((role) => (
            <button
              key={role?.id}
              type="button"
              onClick={() => handleInputChange('role', role?.id)}
              disabled={isLoading}
              className={`p-4 rounded-lg border-2 transition-smooth min-h-touch ${
                formData?.role === role?.id
                  ? 'border-primary bg-primary/10 text-primary' :'border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex flex-col items-center space-y-2">
                <Icon 
                  name={role?.icon} 
                  size={24} 
                  className={formData?.role === role?.id ? 'text-primary' : 'text-muted-foreground'} 
                />
                <span className="font-medium text-sm">{role?.label}</span>
                <span className="text-xs text-center opacity-80">{role?.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <Checkbox
          label="Remember me"
          checked={formData?.rememberMe}
          onChange={(e) => handleInputChange('rememberMe', e?.target?.checked)}
          disabled={isLoading}
          size="sm"
        />
        
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={isLoading}
          className="text-sm text-primary hover:text-primary/80 transition-smooth disabled:opacity-50"
        >
          Forgot password?
        </button>
      </div>
      {/* General Error Message */}
      {error && !error?.includes('email') && !error?.includes('password') && (
        <div className="p-3 rounded-md bg-error/10 border border-error/20">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} className="text-error" />
            <span className="text-sm text-error">{error}</span>
          </div>
        </div>
      )}
      {/* Submit Button */}
      <Button
        type="submit"
        variant="default"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
        iconName="LogIn"
        iconPosition="right"
        className="mt-6"
      >
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
};

export default LoginForm;