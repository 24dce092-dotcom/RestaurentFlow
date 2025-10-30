import React from 'react';
import Icon from '../../../components/AppIcon';

const MenuCategoryTabs = ({ categories, activeCategory, onCategoryChange, className = "" }) => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector(`[data-cat="${activeCategory}"]`);
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  }, [activeCategory]);

  return (
    <div ref={containerRef} className={`flex overflow-x-auto scrollbar-hide space-x-2 pb-2 ${className}`}>
      {categories?.map((category) => (
        <button
          key={category?.id}
          data-cat={category?.id}
          onClick={() => onCategoryChange(category?.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-smooth min-h-touch ${
            activeCategory === category?.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Icon name={category?.icon} size={16} />
          <span className="text-sm font-medium">{category?.name}</span>
          {category?.count > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeCategory === category?.id
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-primary text-primary-foreground'
            }`}>
              {category?.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default MenuCategoryTabs;