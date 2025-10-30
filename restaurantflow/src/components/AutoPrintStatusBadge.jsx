import React, { useEffect, useState } from 'react';
import { apiUrl } from '../utils/api';

// Small badge showing auto-print health summary. Polls every 12s.
export default function AutoPrintStatusBadge({ pollMs = 12000 }) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let aborted = false;
    async function fetchHealth() {
      try {
        const res = await fetch(apiUrl('/api/auto-print/health'));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!aborted) { setHealth(data.health); setError(null); }
      } catch (e) {
        if (!aborted) { setError(e.message); }
      }
    }
    fetchHealth();
    const id = setInterval(() => { setTick(t => t + 1); fetchHealth(); }, pollMs);
    return () => { aborted = true; clearInterval(id); };
  }, [pollMs]);

  const enabled = !!health?.enabled;
  const cls = enabled ? 'bg-green-600' : 'bg-gray-500';
  const failed = (health?.failed || 0) > 0 && (health.failed === health.totalJobs);
  const warn = (health?.failed || 0) > 0 && (health.failed < health.totalJobs);

  let stateColor = cls;
  if (failed) stateColor = 'bg-red-600'; else if (warn) stateColor = 'bg-yellow-600';

  return (
    <div className="fixed bottom-2 right-2 z-40 text-xs font-medium select-none">
      <div
        className={`flex items-center gap-2 text-white px-3 py-1 rounded shadow ${stateColor}`}
        title={error ? `Error: ${error}` : health ? `AutoPrint enabled: ${enabled}\nJobs: ${health.totalJobs} (ok ${health.successful} / fail ${health.failed} / retried ${health.retried})\nQueue: ${health.queueLength}\nLast Error: ${health.lastError || 'none'}\nActive Targets: ${(health.activeTargets||[]).map(t=>t.role+':'+(t.printerId||'none')).join(', ')}` : 'Loading auto print status...'}
      >
        <span>AutoPrint</span>
        {enabled ? <span className="opacity-80">ON</span> : <span className="opacity-80">OFF</span>}
        {health && <span className="opacity-70">Q{health.queueLength}</span>}
        {health && !!health.failed && <span className="opacity-90">F{health.failed}</span>}
        {error && <span className="opacity-90">ERR</span>}
      </div>
    </div>
  );
}
