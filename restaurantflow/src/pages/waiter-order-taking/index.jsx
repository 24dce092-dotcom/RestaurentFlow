import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Icon from '../../components/AppIcon';
import Header from '../../components/ui/Header';
import MenuCategoryTabs from './components/MenuCategoryTabs';
import MenuItemCard from './components/MenuItemCard';
import OrderSummaryPanel from './components/OrderSummaryPanel';
import CustomerSuggestionModal from './components/CustomerSuggestionModal';
import OrderConfirmationModal from './components/OrderConfirmationModal';
import FloatingActionButton from './components/FloatingActionButton';
import BottomActionBar from './components/BottomActionBar';

const WaiterOrderTaking = () => {
  const [activeCategory, setActiveCategory] = useState(() => {
    try {
      const raw = window.localStorage.getItem('waiter.activeCategory');
      return raw ? JSON.parse(raw) : 'all';
    } catch (e) {
      return 'all';
    }
  });

  // Persist activeCategory preference
  useEffect(() => {
    try {
      window.localStorage.setItem('waiter.activeCategory', JSON.stringify(activeCategory));
    } catch (e) {
      // ignore
    }
  }, [activeCategory]);
  const [orderItems, setOrderItems] = useState([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState(null);
  const [customizationIndex, setCustomizationIndex] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(1); // Default to table 1
  const [waiterName] = useState("Sarah Johnson");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Live search query for menu items
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);


  // State for backend tables and menu items
  const [tables, setTables] = useState([]);
  const [menuItemsBackend, setMenuItemsBackend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showOnlyCategory, setShowOnlyCategory] = useState(() => {
    try {
      const raw = window.localStorage.getItem('waiter.showOnlyCategory');
      return raw ? JSON.parse(raw) : false;
    } catch (e) {
      return false;
    }
  });

  // Persist showOnlyCategory preference
  useEffect(() => {
    try {
      window.localStorage.setItem('waiter.showOnlyCategory', JSON.stringify(showOnlyCategory));
    } catch (e) {
      // ignore storage errors
    }
  }, [showOnlyCategory]);

  // Small transient toast to confirm preference saved
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [savedMessage, setSavedMessage] = useState('Preferences saved');

  // Toast when showOnlyCategory changes
  useEffect(() => {
    setSavedMessage(showOnlyCategory ? 'Showing only this category' : 'Showing category with fallback');
    setShowSavedToast(true);
    const t = setTimeout(() => setShowSavedToast(false), 2000);
    return () => clearTimeout(t);
  }, [showOnlyCategory]);

  // Toast when activeCategory changes (include display name when available)
  useEffect(() => {
    const cat = categories?.find(c => c.id === activeCategory);
    const displayName = cat ? cat.name : (activeCategory === 'all' ? 'All Menu' : String(activeCategory));
    setSavedMessage(`Category: ${displayName} selected`);
    setShowSavedToast(true);
    const t = setTimeout(() => setShowSavedToast(false), 2000);
    return () => clearTimeout(t);
  }, [activeCategory, categories]);

  // Table options: prefer backend `tables` when available, otherwise fall back to 8 tables
  const tableOptions = (tables && tables.length > 0)
    ? tables.map(t => t.number || t.tableNumber || t._id || t.id)
    : Array.from({ length: 8 }, (_, i) => i + 1);

  // Debug logging for table options
  useEffect(() => {
    console.log('Tables from backend:', tables);
    console.log('Table options:', tableOptions);
    console.log('Current table number:', tableNumber);
  }, [tables, tableOptions, tableNumber]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.table-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen]);

  // Fetch tables and menu items from backend
  useEffect(() => {
    async function fetchData() {
      try {
        const [tablesRes, menuItemsRes] = await Promise.all([
          api.get('/tables'),
          api.get('/menu-items'),
        ]);
        setTables(tablesRes.data);
        // Enrich menu items with a stable displayId (100, 101, ...) so search by id works
        const enriched = menuItemsRes.data.map((m, i) => ({
          ...m,
          // Prefer backend-provided numeric customId for display; fall back to displayId or deterministic 100+index
          displayId: (m.customId !== undefined && m.customId !== null) ? m.customId : ((m.displayId !== undefined && m.displayId !== null) ? m.displayId : 100 + i),
        }));
        setMenuItemsBackend(enriched);
        // Build categories from menu items
        const cats = Array.from(new Set(enriched.map(m => m.category))).map(cat => ({
          id: cat,
          name: cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '',
          icon: 'UtensilsCrossed',
          count: enriched.filter(m => m.category === cat).length
        }));
        // Prepend an 'All' category
  const allCategory = { id: 'all', name: 'All Menu', icon: 'UtensilsCrossed', count: menuItemsRes.data.length };
        const builtCategories = [allCategory, ...cats];
        setCategories(builtCategories);
        // Validate persisted activeCategory
        try {
          const stored = window.localStorage.getItem('waiter.activeCategory');
          if (stored) {
            const parsed = JSON.parse(stored);
            const exists = builtCategories.some(c => c.id === parsed);
            if (exists) {
              setActiveCategory(parsed);
            } else {
              setActiveCategory('all');
            }
          }
        } catch (e) {
          setActiveCategory('all');
        }
        // Debug logs
        console.log('Loaded menu items:', menuItemsRes.data);
        console.log('Built categories:', cats);
      } catch (err) {
        console.error('Failed to fetch tables or menu items', err);
      }
    }
    fetchData();

    const handleMenuUpdated = () => fetchData();
    const handleTablesUpdated = () => fetchData();
    window.addEventListener('menu-updated', handleMenuUpdated);
    window.addEventListener('tables-updated', handleTablesUpdated);
    // Cross-tab updates via BroadcastChannel
    let bc;
    try {
      bc = new BroadcastChannel('rf-updates');
      bc.onmessage = (e) => {
        if (!e || !e.data) return;
        const { topic } = e.data;
        if (topic === 'menu' || topic === 'tables') fetchData();
      };
    } catch (e) {}
    return () => {
      window.removeEventListener('menu-updated', handleMenuUpdated);
      window.removeEventListener('tables-updated', handleTablesUpdated);
      try { if (bc) bc.close(); } catch (e) {}
    };
  }, []);

  // Compute items to display. If activeCategory is 'all' show all items, otherwise filter by category
  const currentMenuItems = activeCategory === 'all' ? menuItemsBackend : menuItemsBackend.filter(item => item.category === activeCategory);
  const baseDisplay = showOnlyCategory ? currentMenuItems : (currentMenuItems.length > 0 ? currentMenuItems : menuItemsBackend);
  // Apply live search filter (matches name, description, or category)
  const q = (searchQuery || '').trim().toLowerCase();
  const displayMenuItems = q
    ? baseDisplay.filter(item => {
        const name = (item?.name || '').toLowerCase();
        const desc = (item?.description || '').toLowerCase();
        const cat = (item?.category || '').toLowerCase();
        const idStr = item?.displayId ? String(item.displayId) : '';
        return name.includes(q) || desc.includes(q) || cat.includes(q) || idStr.includes(q);
      })
    : baseDisplay;

  // Handle adding items to order
  const handleAddToOrder = (item, quantity) => {
    setOrderItems(prevItems => {
      const itemKey = (item._id || item.id);
      // Distinguish by id + portion so half and full are separate lines
      const portion = item?.portion === 'half' ? 'half' : 'full';
      const existingItemIndex = prevItems?.findIndex(orderItem => {
        const sameId = (orderItem._id || orderItem.id) === itemKey;
        const samePortion = (orderItem.portion === portion) || (!orderItem.portion && portion === 'full');
        return sameId && samePortion;
      });
      if (quantity === 0) {
        return prevItems?.filter(orderItem => {
          const sameId = (orderItem._id || orderItem.id) === itemKey;
          const samePortion = (orderItem.portion === portion) || (!orderItem.portion && portion === 'full');
          return !(sameId && samePortion);
        });
      }
      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = { ...updatedItems?.[existingItemIndex], quantity };
        return updatedItems;
      } else {
        return [...prevItems, { ...item, portion, quantity, specialRequest: '' }];
      }
    });
  };

  // Handle item customization
  const handleCustomizeItem = (item, index) => {
    // If item is already in the order, index will be >= 0 and we set customizationIndex accordingly
    // If not present in the order yet, index may be -1; in that case we open modal to customize before adding
    if (typeof index === 'number' && index >= 0) {
      setSelectedItemForCustomization(orderItems[index]);
      setCustomizationIndex(index);
    } else {
      // Use the menu item as a temporary selected item; saving should attach request to that item when added
      setSelectedItemForCustomization(item);
      setCustomizationIndex(null);
    }
    setShowSuggestionModal(true);
  };

  // Handle special request
  const handleSaveSpecialRequest = (request) => {
    if (selectedItemForCustomization !== null && customizationIndex !== null) {
      setOrderItems(prevItems =>
        prevItems.map((item, idx) =>
          idx === customizationIndex ? { ...item, specialRequest: request } : item
        )
      );
    }
    setSelectedItemForCustomization(null);
    setCustomizationIndex(null);
  };

  // Handle quantity updates
  const handleUpdateQuantity = (uniqueItemId, newQuantity) => {
    // Parse uniqueItemId to get itemId and portion
    const lastDashIndex = uniqueItemId.lastIndexOf('-');
    const itemId = uniqueItemId.substring(0, lastDashIndex);
    const portion = uniqueItemId.substring(lastDashIndex + 1);
    
    if (newQuantity === 0) {
      setOrderItems(prevItems => prevItems?.filter(item => {
        const sameId = (item._id || item.id) === itemId;
        const samePortion = (item.portion === portion) || (!item.portion && portion === 'full');
        return !(sameId && samePortion);
      }));
    } else {
      setOrderItems(prevItems =>
        prevItems?.map(item => {
          const sameId = (item._id || item.id) === itemId;
          const samePortion = (item.portion === portion) || (!item.portion && portion === 'full');
          return (sameId && samePortion) ? { ...item, quantity: newQuantity } : item;
        })
      );
    }
  };

  // Handle removing items
  const handleRemoveItem = (uniqueItemId) => {
    // Parse uniqueItemId to get itemId and portion
    const lastDashIndex = uniqueItemId.lastIndexOf('-');
    const itemId = uniqueItemId.substring(0, lastDashIndex);
    const portion = uniqueItemId.substring(lastDashIndex + 1);
    
    setOrderItems(prevItems => prevItems?.filter(item => {
      const sameId = (item._id || item.id) === itemId;
      const samePortion = (item.portion === portion) || (!item.portion && portion === 'full');
      return !(sameId && samePortion);
    }));
  };

  // Handle adding special request to existing item
  const handleAddSpecialRequest = (uniqueItemId) => {
    // Parse uniqueItemId to get itemId and portion
    const lastDashIndex = uniqueItemId.lastIndexOf('-');
    const itemId = uniqueItemId.substring(0, lastDashIndex);
    const portion = uniqueItemId.substring(lastDashIndex + 1);
    
    const index = orderItems?.findIndex(orderItem => {
      const sameId = (orderItem._id || orderItem.id) === itemId;
      const samePortion = (orderItem.portion === portion) || (!orderItem.portion && portion === 'full');
      return sameId && samePortion;
    });
    if (index >= 0) {
      setSelectedItemForCustomization(orderItems[index]);
      setCustomizationIndex(index);
      setShowSuggestionModal(true);
    }
  };

  // Handle order submission
  const handleSubmitOrder = () => {
    if (orderItems?.length > 0) {
      setShowConfirmationModal(true);
    }
  };

  // Handle order confirmation
  // Helper to get table _id by number
  function getTableIdByNumber(tableNumber) {
    const table = tables?.find(
      (t) => t.number === Number(tableNumber) || t.tableNumber === Number(tableNumber)
    );
    return table ? table._id : null;
  }

  // Helper to get menu item _id by name
  function getMenuItemIdByName(name) {
    const item = menuItemsBackend?.find((m) => m.name === name);
    return item ? item._id : null;
  }

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      // Find table ObjectId by number
      const tableObjId = getTableIdByNumber(tableNumber);
      if (!tableObjId) throw new Error('Table not found');

      // Map order items to backend format (menuItem ObjectId)
      const items = orderItems.map(item => {
        const menuItemObjId = getMenuItemIdByName(item.name);
        if (!menuItemObjId) throw new Error('Menu item not found: ' + item.name);
        return {
          menuItem: menuItemObjId,
          quantity: item.quantity,
          portion: item.portion === 'half' ? 'half' : 'full',
          notes: item.specialRequest || ''
        };
      });

      // Calculate total from backend menu item prices
      const total = orderItems.reduce((sum, item) => {
        const backendItem = menuItemsBackend.find(m => m.name === item.name);
        if (!backendItem) return sum;
        const base = Number(backendItem.price || 0);
        const isHalf = item.portion === 'half';
        const halfOverride = (backendItem.halfPrice != null) ? Number(backendItem.halfPrice) : null;
        const unit = isHalf ? (halfOverride != null ? halfOverride : base * 0.7) : base;
        return sum + (unit * (item.quantity || 1));
      }, 0);
      const newOrder = {
        table: tableObjId,
        items,
        status: 'pending',
        total,
        priority: isUrgent ? 'urgent' : 'normal'
      };
      const res = await api.post('/orders', newOrder);
      // dispatch the server-created order (with _id, timestamps) so listeners get authoritative data
      window.dispatchEvent(new CustomEvent('orders-updated', { detail: res.data }));
      setOrderItems([]);
      setIsUrgent(false);
      setShowConfirmationModal(false);
      alert(`Order submitted successfully for Table ${tableNumber}!`);
    } catch (e) {
      alert('Failed to submit order. Please try again.');
      console.error('Order submission error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    console.log('Draft saved:', { tableNumber, items: orderItems });
    alert('Order draft saved successfully!');
  };

  // Handle clear all
  const handleClearAll = () => {
    if (orderItems?.length > 0) {
      if (confirm('Are you sure you want to clear all items?')) {
        setOrderItems([]);
        setIsUrgent(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header userRole="waiter" onToggleSidebar={() => {}} />
  {/* Main Content */}
  <div className="pt-16 pb-32 lg:pb-24">
        <div className="container mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-foreground">Take Order</h1>
                {/* Table Selection Dropdown - Custom Implementation */}
                <div className="flex items-center gap-2 relative z-50 table-dropdown">
                  <label className="font-medium text-foreground whitespace-nowrap">Table:</label>
                  <div className="relative z-50">
                    {/* Dropdown Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Dropdown toggle clicked, current state:', isDropdownOpen);
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className={`bg-white border-2 rounded-lg px-3 py-1.5 text-gray-900 font-medium focus:outline-none cursor-pointer min-w-[90px] shadow-sm flex items-center justify-between gap-2 transition-colors ${
                        isDropdownOpen 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span className="text-sm">{tableNumber}</span>
                      <svg className={`w-3 h-3 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Options */}
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 w-full bg-white border-2 border-gray-300 rounded-lg shadow-xl z-[9999] mt-1 max-h-48 overflow-y-auto">
                        {tableOptions.map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              console.log('Table option clicked:', num);
                              setTableNumber(Number(num));
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 transition-colors ${
                              tableNumber === num ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Waiter-only features */}
              {/* Sound button removed as requested */}
            </div>
            
            {/* Live Search Input for waiter app */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent w-64"
                />
                <Icon 
                  name="Search" 
                  size={18} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <MenuCategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            className="mb-6"
          />
          <div className="flex items-center space-x-3 mb-6">
            <label className="flex items-center space-x-2 text-sm text-muted-foreground">
              <input type="checkbox" className="form-checkbox" checked={showOnlyCategory} onChange={e => setShowOnlyCategory(e.target.checked)} />
              <span>Show only this category</span>
            </label>
            <div>
              <div className={`ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded shadow transition-opacity duration-300 ${showSavedToast ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {savedMessage}
              </div>
              <div className="sr-only" aria-live="polite">{savedMessage}</div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Menu Items Panel */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayMenuItems?.map((item, idx) => {
                  const itemKey = (item._id || item.id) + '-' + idx;
                  // Find the matching order item by id to avoid relying on array index which can be out of sync
                  const itemId = item._id || item.id;
                  const orderItems_forThisItem = orderItems?.filter(oi => (oi._id || oi.id) === itemId) || [];
                  const halfOrderItem = orderItems_forThisItem.find(oi => oi.portion === 'half');
                  const fullOrderItem = orderItems_forThisItem.find(oi => oi.portion === 'full' || !oi.portion);
                  
                  // Calculate total quantity for display (half + full)
                  const totalQuantity = (halfOrderItem?.quantity || 0) + (fullOrderItem?.quantity || 0);
                  
                  // Determine the index of the order item for customization flows
                  const orderItemIndex = orderItems?.findIndex(oi => (oi._id || oi.id) === itemId);
                  return (
                    <MenuItemCard
                      key={itemKey}
                      item={item}
                      quantity={totalQuantity}
                      halfQuantity={halfOrderItem?.quantity || 0}
                      fullQuantity={fullOrderItem?.quantity || 0}
                      onAddToOrder={handleAddToOrder}
                      onCustomize={() => handleCustomizeItem(item, orderItemIndex)}
                      displayId={item.displayId}
                    />
                  );
                })}
              </div>
              
              {displayMenuItems?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon name="Coffee" size={48} className="text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No items available</h3>
                  <p className="text-muted-foreground">This category is currently empty.</p>
                </div>
              )}
            </div>

            {/* Order Summary Panel - Desktop */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <OrderSummaryPanel
                  orderItems={orderItems}
                  tableNumber={tableNumber}
                  isUrgent={isUrgent}
                  onToggleUrgent={() => setIsUrgent(!isUrgent)}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onAddSpecialRequest={handleAddSpecialRequest}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Components */}
      <div className="lg:hidden">
        {/* Floating Action Button */}
        <FloatingActionButton
          onCustomerSuggestion={() => setShowSuggestionModal(true)}
        />

        {/* Bottom Action Bar */}
        <BottomActionBar
          orderItems={orderItems}
          onSubmitOrder={handleSubmitOrder}
          onSaveDraft={handleSaveDraft}
          onClearAll={handleClearAll}
          isSubmitting={isSubmitting}
        />
      </div>
      {/* Desktop Action Bar */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-modal z-navigation">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {orderItems?.length > 0 && (
                <>
                  <div className="flex items-center space-x-2">
                    <Icon name="ShoppingCart" size={16} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {orderItems?.reduce((sum, item) => sum + item?.quantity, 0)} items
                    </span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <span className="text-lg font-bold text-primary">
                    ${orderItems?.reduce((sum, item) => sum + (item?.price * item?.quantity), 0)?.toFixed(2)}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleClearAll}
                disabled={orderItems?.length === 0 || isSubmitting}
                className="text-error hover:text-error/80 transition-smooth p-2 disabled:opacity-50"
              >
                <Icon name="Trash2" size={18} />
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={orderItems?.length === 0 || isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-smooth disabled:opacity-50"
              >
                <Icon name="Save" size={16} />
                <span>Save Draft</span>
              </button>
              
              <button
                onClick={handleSubmitOrder}
                disabled={orderItems?.length === 0 || isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-smooth disabled:opacity-50"
              >
                <Icon name="Send" size={16} />
                <span>Submit Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modals */}
      <CustomerSuggestionModal
        isOpen={showSuggestionModal}
        onClose={() => {
          setShowSuggestionModal(false);
          setSelectedItemForCustomization(null);
        }}
        onSave={handleSaveSpecialRequest}
        initialRequest={selectedItemForCustomization?.specialRequest || ''}
        itemName={selectedItemForCustomization?.name || ''}
      />
      <OrderConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmOrder}
        orderItems={orderItems}
        tableNumber={tableNumber}
        isUrgent={isUrgent}
        waiterName={waiterName}
      />
    </div>
  );
};

export default WaiterOrderTaking;