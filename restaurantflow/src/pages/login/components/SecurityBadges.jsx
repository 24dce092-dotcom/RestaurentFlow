import React from 'react';
import Icon from '../../../components/AppIcon';

const SecurityBadges = ({ className = "" }) => {
  const securityFeatures = [
    {
      icon: 'Shield',
      label: 'SSL Encrypted',
      description: 'Your data is protected with 256-bit encryption'
    },
    {
      icon: 'Lock',
      label: 'Secure Login',
      description: 'Multi-factor authentication available'
    },
    {
      icon: 'Database',
      label: 'Data Protected',
      description: 'GDPR compliant data handling'
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Your Security is Our Priority
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {securityFeatures?.map((feature, index) => (
          <div
            key={index}
            className="flex flex-col items-center p-3 rounded-lg bg-muted/50 border border-border/50"
          >
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center mb-2">
              <Icon name={feature?.icon} size={16} className="text-success" />
            </div>
            <span className="text-xs font-medium text-foreground text-center">
              {feature?.label}
            </span>
            <span className="text-xs text-muted-foreground text-center mt-1">
              {feature?.description}
            </span>
          </div>
        ))}
      </div>
      {/* Trust Indicators */}
      <div className="flex items-center justify-center space-x-4 pt-2">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Secure Connection</span>
        </div>
        <div className="flex items-center space-x-1">
          <Icon name="CheckCircle" size={12} className="text-success" />
          <span className="text-xs text-muted-foreground">Verified Platform</span>
        </div>
      </div>
    </div>
  );
};

export default SecurityBadges;