import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const MockCredentials = ({ onFillCredentials, className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const mockUsers = [
    {
      role: 'waiter',
      email: 'waiter@restaurantflow.com',
      password: 'waiter123',
      name: 'Sarah Johnson',
      description: 'Mobile order taking and table management'
    },
    {
      role: 'owner',
      email: 'owner@restaurantflow.com',
      password: 'owner123',
      name: 'Michael Chen',
      description: 'Full analytics and business oversight'
    },
    {
      role: 'manager',
      email: 'manager@restaurantflow.com',
      password: 'manager123',
      name: 'Emily Rodriguez',
      description: 'Staff coordination and operations'
    }
  ];

  const handleFillCredentials = (user) => {
    onFillCredentials({
      email: user?.email,
      password: user?.password,
      role: user?.role
    });
    setIsExpanded(false);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'waiter': return 'Users';
      case 'owner': return 'Crown';
      case 'manager': return 'Shield';
      default: return 'User';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'waiter': return 'text-primary';
      case 'owner': return 'text-warning';
      case 'manager': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={`bg-muted/30 rounded-lg border border-border/50 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-smooth rounded-lg"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <Icon name="TestTube" size={16} className="text-accent" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-foreground">Demo Credentials</h3>
            <p className="text-xs text-muted-foreground">Click to use test accounts</p>
          </div>
        </div>
        <Icon 
          name={isExpanded ? 'ChevronUp' : 'ChevronDown'} 
          size={16} 
          className="text-muted-foreground" 
        />
      </button>
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="h-px bg-border/50 mb-4"></div>
          
          {mockUsers?.map((user, index) => (
            <div
              key={index}
              className="p-3 rounded-md bg-card border border-border/50 hover:border-primary/30 transition-smooth"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Icon 
                      name={getRoleIcon(user?.role)} 
                      size={14} 
                      className={getRoleColor(user?.role)} 
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {user?.role}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({user?.name})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user?.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {user?.email}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {user?.password}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFillCredentials(user)}
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  Use
                </Button>
              </div>
            </div>
          ))}
          
          <div className="mt-4 p-3 rounded-md bg-warning/10 border border-warning/20">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={14} className="text-warning mt-0.5" />
              <div>
                <p className="text-xs text-warning font-medium">Demo Mode</p>
                <p className="text-xs text-warning/80 mt-1">
                  These are test credentials for demonstration purposes. In production, use your actual login details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockCredentials;