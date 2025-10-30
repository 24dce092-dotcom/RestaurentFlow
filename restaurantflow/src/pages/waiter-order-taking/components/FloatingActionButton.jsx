import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FloatingActionButton = ({ onCustomerSuggestion, className = "" }) => {
  return (
    <div className={`fixed bottom-6 right-6 z-dropdown ${className}`}>
      <Button
        variant="default"
        size="icon"
        onClick={onCustomerSuggestion}
        className="w-14 h-14 rounded-full shadow-floating hover:shadow-modal transition-all duration-200"
      >
        <Icon name="MessageSquare" size={24} />
      </Button>
    </div>
  );
};

export default FloatingActionButton;