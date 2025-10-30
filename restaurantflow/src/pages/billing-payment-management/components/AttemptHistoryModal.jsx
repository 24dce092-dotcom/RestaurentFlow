import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const AttemptHistoryModal = ({ isOpen, onClose, attempts = [] }) => {
  const modalRef = React.useRef(null);
  const [selectedAttempt, setSelectedAttempt] = React.useState(null);
  const [filter, setFilter] = React.useState('all'); // 'all' | 'success' | 'failed'

  // Filter attempts based on status
  const filteredAttempts = React.useMemo(() => {
    if (filter === 'all') return attempts;
    return attempts.filter(attempt => {
      if (filter === 'success') {
        return attempt.status >= 200 && attempt.status < 300;
      }
      return attempt.error || attempt.status >= 400;
    });
  }, [attempts, filter]);

  // Group filtered attempts by day for better organization
  const groupedAttempts = React.useMemo(() => {
    return filteredAttempts.reduce((groups, attempt) => {
      const date = new Date(attempt.timestamp);
      const day = date.toLocaleDateString();
      
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(attempt);
      return groups;
    }, {});
  }, [filteredAttempts]);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Focus trap
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements?.length) {
        focusableElements[0].focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div 
        ref={modalRef}
        className="relative bg-card w-full max-w-2xl mx-4 rounded-lg shadow-lg max-h-[80vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex flex-col border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <Icon name="History" size={20} />
              <h2 id="modal-title" className="text-lg font-semibold">Save Attempt History</h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              aria-label="Close history modal"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
          
          <div className="px-4 pb-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <span>Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-2 py-1 border border-border rounded bg-background text-sm"
              >
                <option value="all">All Attempts</option>
                <option value="success">Successful Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Showing {filteredAttempts.length} of {attempts.length} attempts
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {attempts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No save attempts recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg space-y-2 transition-colors cursor-pointer
                    ${selectedAttempt === index ? 'bg-primary/10 border border-primary/20' : 'bg-muted/10 hover:bg-muted/20'}
                  `}
                  onClick={() => setSelectedAttempt(selectedAttempt === index ? null : index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedAttempt(selectedAttempt === index ? null : index);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={selectedAttempt === index}
                  aria-controls={`attempt-details-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Attempt #{attempts.length - index}
                      {attempt.status >= 200 && attempt.status < 300 && (
                        <span className="ml-2 text-xs text-success">✓ Success</span>
                      )}
                      {attempt.error && (
                        <span className="ml-2 text-xs text-destructive">✗ Failed</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(attempt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">URL:</span>{' '}
                      <span className="font-mono text-xs">{attempt.url}</span>
                    </div>
                    
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`font-mono ${
                        attempt.status >= 200 && attempt.status < 300 
                          ? 'text-success' 
                          : 'text-destructive'
                      }`}>
                        {attempt.status || 'N/A'}
                      </span>
                    </div>

                    {attempt.error && (
                      <div>
                        <span className="font-medium">Error:</span>{' '}
                        <span className="text-destructive">{attempt.error}</span>
                      </div>
                    )}

                    {attempt.payload && (
                      <div>
                        <span className="font-medium">Payload:</span>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify(attempt.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {attempt.response && (
                      <div>
                        <span className="font-medium">Response:</span>
                        <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify(attempt.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Save attempt history is only visible in development mode
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttemptHistoryModal;