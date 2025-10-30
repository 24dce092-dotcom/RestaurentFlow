import { apiUrl } from './api';

export async function getAutoPrintConfig() {
  const r = await fetch(apiUrl('/api/auto-print/config'));
  if (!r.ok) throw new Error('Failed to fetch config');
  return r.json();
}
export async function updateAutoPrintConfig(patch) {
  const r = await fetch(apiUrl('/api/auto-print/config'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
  if (!r.ok) throw new Error('Failed to update config');
  return r.json();
}
export async function getAutoPrintStatus() {
  const r = await fetch(apiUrl('/api/auto-print/status'));
  if (!r.ok) throw new Error('Failed to fetch status');
  return r.json();
}
export async function enqueueTestJob() {
  const r = await fetch(apiUrl('/api/auto-print/test'), { method: 'POST' });
  if (!r.ok) throw new Error('Failed to enqueue test');
  return r.json();
}
export async function listPrinters() {
  const r = await fetch(apiUrl('/api/auto-print/printers'));
  if (!r.ok) throw new Error('Failed to list printers');
  return r.json();
}
