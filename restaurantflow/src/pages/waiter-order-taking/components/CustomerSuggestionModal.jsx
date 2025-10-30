import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const CustomerSuggestionModal = ({ isOpen, onClose, onSave, initialRequest = "", itemName = "" }) => {
  const [suggestion, setSuggestion] = useState(initialRequest);
  const [selectedOptions, setSelectedOptions] = useState([]);

  // When the modal opens (or the initialRequest changes), prefill quick options and custom text
  React.useEffect(() => {
    if (!isOpen) return;
    const text = (initialRequest || '').trim();
    if (!text) {
      setSelectedOptions([]);
      setSuggestion('');
      return;
    }

    // Try to detect known quick options inside initialRequest (case-insensitive)
    const lowered = text.toLowerCase();
    const matched = [];
    let remaining = text;

    commonRequests.forEach(opt => {
      const label = opt.label || '';
      if (!label) return;
      const idx = lowered.indexOf(label.toLowerCase());
      if (idx >= 0) {
        matched.push({ id: opt.id, label: opt.label });
        // remove the matched label from remaining text (first occurrence)
        const regex = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        remaining = remaining.replace(regex, '').replace(/\s*,\s*,?/g, ',').trim();
      }
    });

    // Clean up leading/trailing commas and whitespace
    remaining = remaining.replace(/^,\s*/, '').replace(/\s*,\s*$/, '').trim();

    setSelectedOptions(matched);
    setSuggestion(remaining);
  }, [isOpen, initialRequest]);

  const commonRequests = [
    { id: 'no-onions', label: 'No Onions', icon: 'X' },
    { id: 'extra-spicy', label: 'Extra Spicy', icon: 'Flame' },
    { id: 'less-salt', label: 'Less Salt', icon: 'Minus' },
    { id: 'on-side', label: 'Sauce on Side', icon: 'ArrowRight' },
    { id: 'well-done', label: 'Well Done', icon: 'Clock' },
    { id: 'no-dairy', label: 'No Dairy', icon: 'X' },
    { id: 'gluten-free', label: 'Gluten Free', icon: 'Shield' },
    { id: 'extra-cheese', label: 'Extra Cheese', icon: 'Plus' }
  ];

  const handleToggleOption = (optionId, label) => {
    setSelectedOptions(prev => {
      const isSelected = prev?.some(opt => opt?.id === optionId);
      if (isSelected) {
        return prev?.filter(opt => opt?.id !== optionId);
      } else {
        return [...prev, { id: optionId, label }];
      }
    });
  };

  const handleSave = () => {
    const combinedRequest = [
      ...selectedOptions?.map(opt => opt?.label),
      suggestion?.trim()
    ]?.filter(Boolean)?.join(', ');
    
    onSave(combinedRequest);
    onClose();
    setSuggestion('');
    setSelectedOptions([]);
  };

  const handleClose = () => {
    onClose();
    setSuggestion(initialRequest);
    setSelectedOptions([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-overlay">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-subtle" onClick={handleClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-lg shadow-modal max-h-[80vh] overflow-hidden md:relative md:max-w-md md:mx-auto md:mt-20 md:rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Special Request</h3>
            {itemName && (
              <p className="text-sm text-muted-foreground">for {itemName}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Quick Options */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Quick Options</h4>
            <div className="grid grid-cols-2 gap-2">
              {commonRequests?.map((option) => (
                <button
                  key={option?.id}
                  onClick={() => handleToggleOption(option?.id, option?.label)}
                  className={`flex items-center space-x-2 p-3 rounded-lg border transition-smooth min-h-touch ${
                    selectedOptions?.some(opt => opt?.id === option?.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  <Icon name={option?.icon} size={16} />
                  <span className="text-sm font-medium">{option?.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Request */}
          <div className="mb-6">
            <Input
              label="Custom Request"
              type="text"
              placeholder="Enter any special instructions..."
              value={suggestion}
              onChange={(e) => setSuggestion(e?.target?.value)}
              description="Be specific about modifications or preferences"
            />
          </div>

          {/* Preview */}
          {(selectedOptions?.length > 0 || suggestion?.trim()) && (
            <div className="mb-6 p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">Preview</h4>
              <p className="text-sm text-muted-foreground">
                {[...selectedOptions?.map(opt => opt?.label), suggestion?.trim()]?.filter(Boolean)?.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              className="flex-1"
              disabled={selectedOptions?.length === 0 && !suggestion?.trim()}
            >
              Save Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSuggestionModal;