import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const MenuItemCard = ({ item, onAddToOrder, onCustomize, className = "", quantity = 0, halfQuantity = 0, fullQuantity = 0, displayId }) => {
  const formatPrice = (p) => {
    if (p == null || Number.isNaN(Number(p))) return '-';
    return `₹${Number(p).toFixed(2)}`;
  };

  const computeDisplayId = () => {
    // Prefer explicit displayId passed from parent
    if (displayId !== undefined && displayId !== null) return displayId;
    if (item?.customId !== undefined && item?.customId !== null) return item.customId;
    // Prefer backend id if available
    if (item?.id) return item.id;
    if (item?._id) return item._id;

    // Fallback: deterministic numeric id based on name+price hashed into a 3-5 digit number (starting at 100)
    try {
      const base = `${item?.name || ''}:${item?.price || ''}`;
      let h = 0;
      for (let i = 0; i < base.length; i++) {
        h = (h << 5) - h + base.charCodeAt(i);
        h |= 0;
      }
      const n = Math.abs(h) % 9000; // 0..8999
      return 100 + n; // 100 .. 9099
    } catch (e) {
      return Math.floor(Math.random() * 9000) + 100;
    }
  };
    const handleAddItem = () => {
    const currentQuantity = quantity || 0;
    let newQuantity, portionToAdd;
    
    if (item?.allowHalf && currentQuantity === 0) {
      // First click on items with allowHalf: add half portion
      newQuantity = 1;
      portionToAdd = 'half';
    } else {
      // Subsequent clicks: add full portions
      newQuantity = currentQuantity + 1;
      portionToAdd = 'full';
    }
    
    const itemToAdd = { ...item, portion: portionToAdd };
    onAddToOrder(itemToAdd, newQuantity);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleRemoveItem = () => {
    // Remove from full portion first, then half portion
    if (fullQuantity > 0) {
      const newQuantity = fullQuantity - 1;
      const itemToRemove = { ...item, portion: 'full' };
      onAddToOrder(itemToRemove, newQuantity);
    } else if (halfQuantity > 0) {
      const newQuantity = halfQuantity - 1;
      const itemToRemove = { ...item, portion: 'half' };
      onAddToOrder(itemToRemove, newQuantity);
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  };

  const handleCustomize = () => {
    onCustomize();
  };

  // Determine if half portion is selected for this card
  // Display logic: show (Half) and half price when quantity is 1 and item allows half
  const isShowingHalf = item?.allowHalf && quantity === 1;
  const displayName = isShowingHalf ? `${item?.name} (Half)` : item?.name;
  const base = Number(item?.price || 0);
  const halfOverride = (item?.halfPrice != null) ? Number(item.halfPrice) : null;
  const halfPrice = halfOverride != null ? halfOverride : base * 0.7;
  const displayPrice = isShowingHalf ? halfPrice : base;

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden shadow-sm ${className}`}>
      {/* Item Image */}
      <div className="relative h-32 overflow-hidden">
        <Image
          src={item?.image}
          alt={item?.name}
          className="w-full h-full object-cover"
        />
        {!item?.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Out of Stock</span>
          </div>
        )}
        {item?.isSpicy && (
          <div className="absolute top-2 left-2 bg-error text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
            <Icon name="Flame" size={12} className="mr-1" />
            Spicy
          </div>
        )}
        {item?.isVegetarian && (
          <div className="absolute top-2 right-2 bg-success text-white p-1 rounded-full">
            <Icon name="Leaf" size={12} />
          </div>
        )}
      </div>
      {/* Item Details */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">{displayName}</h3>
          <span className="text-sm font-bold text-primary ml-2">{formatPrice(displayPrice)}</span>
        </div>
        
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item?.description}</p>
        
    {/* Item ID (replaces preparation time)
      - Uses item.id or item._id when present (from backend).
      - Falls back to a short numeric hash derived from name:price to keep IDs stable across renders.
      - To change format, replace the fallback generation with your preferred scheme (e.g., UUID or server-provided id).
    */}
        <div className="flex items-center text-xs text-muted-foreground mb-3">
          {/* Display a stable numeric ID: prefer parent-provided displayId, then backend id, otherwise a deterministic fallback */}
          <span className="font-medium">ID: {computeDisplayId()}</span>

          {item?.rating && (
            <>
              <Icon name="Star" size={12} className="ml-3 mr-1 text-warning" />
              <span>{item?.rating}</span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCustomize}
            disabled={!item?.available}
            className="text-xs"
          >
            <Icon name="Settings" size={14} className="mr-1" />
            Customize
          </Button>
          
          <div className="flex items-center space-x-2">
            {item?.allowHalf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const base = Number(item?.price || 0);
                  const halfOverride = (item?.halfPrice != null) ? Number(item.halfPrice) : null;
                  const unit = halfOverride != null ? halfOverride : base * 0.7;
                  const halfItem = { ...item, portion: 'half', basePrice: base, unitPrice: unit };
                  // Always add a new half portion line
                  onAddToOrder(halfItem, 1);
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(30);
                  }
                }}
                disabled={!item?.available}
                className="text-[11px] h-8"
                title="Add Half Plate"
              >
                Half
              </Button>
            )}
            {quantity > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleRemoveItem}
                className="w-8 h-8"
              >
                <Icon name="Minus" size={14} />
              </Button>
            )}
            {quantity > 0 && (
              <span className="text-sm font-medium text-foreground min-w-[20px] text-center">
                {halfQuantity > 0 && fullQuantity > 0 
                  ? `${halfQuantity > 0 ? '½' : ''}${fullQuantity > 0 ? `+${fullQuantity}` : ''}`
                  : halfQuantity > 0 
                    ? '½' 
                    : fullQuantity}
              </span>
            )}
            <Button
              variant={quantity > 0 ? "default" : "outline"}
              size="icon"
              onClick={() => {
                // Always add/increment full portion - use fullQuantity instead of total quantity
                const newQuantity = fullQuantity + 1;
                const itemToAdd = { ...item, portion: 'full' };
                onAddToOrder(itemToAdd, newQuantity);
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(30);
                }
              }}
              disabled={!item?.available}
              className="w-8 h-8"
            >
              <Icon name="Plus" size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;