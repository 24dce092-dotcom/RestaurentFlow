import React from 'react';
import Icon from '../../../components/AppIcon';

const RestaurantLogo = ({ size = 'default', className = "" }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    default: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-xl',
    default: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses?.[size]} bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg`}>
        <Icon name="ChefHat" size={size === 'sm' ? 24 : size === 'lg' ? 32 : 28} color="white" />
      </div>
      {/* Restaurant Name */}
      <div className="text-center">
        <h1 className={`${textSizeClasses?.[size]} font-bold text-foreground`}>
          RestaurantFlow
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Streamline Your Restaurant Operations
        </p>
      </div>
      {/* Tagline */}
      <div className="text-center max-w-sm">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Real-time order management, analytics, and seamless coordination for modern restaurants
        </p>
      </div>
    </div>
  );
};

export default RestaurantLogo;