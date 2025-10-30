import React, { useEffect } from 'react';

const Modal = ({ title, children, onClose, width = '720px', actions = null }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose && onClose()} />
      <div className="relative bg-white rounded-lg shadow-2xl border border-border" style={{ width }}>
        <div className="p-3 flex items-center justify-between border-b border-border">
          <div className="text-lg font-semibold">{title}</div>
          <div className="flex items-center space-x-2">
            {actions}
            <button className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => onClose && onClose()}>Close</button>
          </div>
        </div>
        <div className="p-4 max-h-[80vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
