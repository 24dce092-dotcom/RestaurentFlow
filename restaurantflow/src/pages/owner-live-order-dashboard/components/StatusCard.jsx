import React, { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/AppIcon';

const StatusCard = ({ label, value, color = 'text-gray-800', icon = 'Clock', isUrgent = false }) => {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);
  const [animateChange, setAnimateChange] = useState(false);

  useEffect(() => {
    if (value !== prev.current) {
      setAnimateChange(true);
      const t = setTimeout(() => setAnimateChange(false), 600);

      // Pulse when urgent increased
      if (isUrgent && value > (prev.current || 0)) {
        setPulse(true);
        const tt = setTimeout(() => setPulse(false), 1200);
        return () => clearTimeout(tt);
      }

      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => { prev.current = value; }, [value]);

  return (
    <div className={`rounded-lg border p-4 bg-white flex items-center justify-between transition-shadow ${animateChange ? 'shadow-lg' : 'shadow-sm'}`}>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
      </div>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-md ${isUrgent && pulse ? 'animate-ping bg-red-200' : ''}`}>
          <Icon name={icon} size={24} className={color} />
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
