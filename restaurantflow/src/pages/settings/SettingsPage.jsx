import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
// Broadcast updates across tabs/windows so other pages can refresh without reload
const broadcastUpdate = (topic, action, payload = {}) => {
  try {
    const bc = new BroadcastChannel('rf-updates');
    bc.postMessage({ topic, action, ...payload, ts: Date.now() });
    bc.close();
  } catch (e) {}
};
import { apiUrl } from '../../utils/api';

const SettingsPage = () => {
  // No client-side role guard - settings page is accessible to all users in this build

  const [tab, setTab] = useState('menu');
  return (
    <div className="min-h-screen pt-16 bg-background">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <div>
            {/* Always show Back button on the Settings page */}
            <Button size="sm" variant="default" className="mt-2 mr-2 shadow-sm rounded-full" onClick={() => window.history.back()}>Back</Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="inline-flex rounded-md bg-card border border-border p-1">
            <TabButton active={tab === 'menu'} onClick={() => setTab('menu')}>Menu</TabButton>
            <TabButton active={tab === 'tables'} onClick={() => setTab('tables')}>Tables</TabButton>
            <TabButton active={tab === 'bill'} onClick={() => setTab('bill')}>Bill Template</TabButton>
            <TabButton active={tab === 'autoprint'} onClick={() => setTab('autoprint')}>Auto Print</TabButton>
          </div>
        </div>

        <div className="space-y-4">
          {tab === 'menu' && <MenuSection />}
          {tab === 'tables' && <TablesSection />}
          {tab === 'bill' && <BillTemplateSection />}
          {tab === 'autoprint' && <AutoPrintSection />}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded ${active ? 'bg-primary text-white' : 'text-muted-foreground'}`}
  >
    {children}
  </button>
);

const ConfirmModal = ({ open, title, message, onCancel, onConfirm, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-card border border-border p-6 rounded shadow-md w-[420px]">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* Auto Print Section */
import { getAutoPrintConfig, updateAutoPrintConfig, getAutoPrintStatus, enqueueTestJob, listPrinters } from '../../utils/autoPrintApi';
const AutoPrintSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cfg, st, pr] = await Promise.all([
          getAutoPrintConfig(),
          getAutoPrintStatus().catch(()=>null),
          listPrinters()
        ]);
        if (!mounted) return;
        setConfig(cfg.config);
        setStatus(st?.stats || null);
        setPrinters(pr.printers || []);
      } catch (e) {
        setError(e.message);
      } finally { mounted && setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const updateField = (path, value) => {
    setConfig(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      const segs = path.split('.');
      let cur = clone;
      while (segs.length > 1) cur = cur[segs.shift()];
      cur[segs[0]] = value;
      return clone;
    });
    setDirty(true);
  };

  const toggleTrigger = (t) => {
    setConfig(prev => {
      const triggers = new Set(prev.triggers);
      triggers.has(t) ? triggers.delete(t) : triggers.add(t);
      return { ...prev, triggers: Array.from(triggers) };
    });
    setDirty(true);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const resp = await updateAutoPrintConfig(config);
      setConfig(resp.config);
      setDirty(false);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const runTest = async () => {
    try { await enqueueTestJob(); alert('Test print job enqueued'); } catch(e) { alert('Test failed: '+e.message); }
  };

  const refreshStatus = async () => {
    try { const st = await getAutoPrintStatus(); setStatus(st.stats); } catch(e) { setError(e.message); }
  };

  if (loading) return <div className="p-4 text-sm">Loading auto print settings...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;
  if (!config) return <div className="p-4 text-sm">No config loaded.</div>;

  const triggerOptions = ['bill_created','bill_paid','bill_updated'];
  const formats = ['receipt','kitchen','a4'];

  const printerOptions = [{ id: '', name: 'Default (service default)' }, ...printers];

  const TargetEditor = ({ role }) => {
    const tgt = config.targets[role];
    if (!tgt) return null;
    return (
      <div className="border rounded p-3 space-y-2 bg-card/40">
        <div className="flex items-center justify-between">
          <h4 className="font-medium capitalize">{role} target</h4>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={tgt.active} onChange={e=>updateField(`targets.${role}.active`, e.target.checked)} /> Active
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block mb-1">Printer</label>
            <select
              className="w-full border rounded px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-muted"
              value={tgt.printerId || ''}
              onChange={e=>updateField(`targets.${role}.printerId`, e.target.value || null)}
              style={{ zIndex: 10, position: 'relative' }}
            >
              {printerOptions.map(p => <option key={p.id || 'default'} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1">Format</label>
            <select
              className="w-full border rounded px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-muted"
              value={tgt.format}
              onChange={e=>updateField(`targets.${role}.format`, e.target.value)}
              style={{ zIndex: 10, position: 'relative' }}
            >
              {formats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Auto Print</h3>
        <div className="flex gap-2">
          <button disabled={!dirty||saving} onClick={save} className="px-3 py-1 rounded bg-primary text-white text-sm disabled:opacity-50">{saving? 'Saving...' : 'Save'}</button>
          <button onClick={runTest} className="px-3 py-1 rounded bg-secondary text-sm">Test Print</button>
          <button onClick={refreshStatus} className="px-3 py-1 rounded bg-secondary text-sm">Refresh Status</button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.enabled} onChange={e=>updateField('enabled', e.target.checked)} /> Enabled
        </label>
        <div className="flex gap-3 text-xs">{triggerOptions.map(t => (
          <label key={t} className="flex items-center gap-1">
            <input type="checkbox" checked={config.triggers.includes(t)} onChange={()=>toggleTrigger(t)} /> {t.replace('bill_','')}
          </label>
        ))}</div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <TargetEditor role="receipt" />
        <TargetEditor role="kitchen" />
        <TargetEditor role="backup" />
      </div>
      <div className="border rounded p-3 text-xs space-y-2 bg-card/40">
        <h4 className="font-medium">Retry Strategy</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block mb-1">Attempts</label>
            <input type="number" className="w-full border rounded px-2 py-1 bg-background" value={config.retry.attempts} onChange={e=>updateField('retry.attempts', Number(e.target.value)||0)} />
          </div>
          <div>
            <label className="block mb-1">Initial Delay (ms)</label>
            <input type="number" className="w-full border rounded px-2 py-1 bg-background" value={config.retry.delayMs} onChange={e=>updateField('retry.delayMs', Number(e.target.value)||0)} />
          </div>
          <div>
            <label className="block mb-1">Backoff Factor</label>
            <input type="number" className="w-full border rounded px-2 py-1 bg-background" value={config.retry.backoffFactor} step="0.1" onChange={e=>updateField('retry.backoffFactor', Number(e.target.value)||1)} />
          </div>
        </div>
      </div>
      <div className="border rounded p-3 text-xs space-y-1 bg-card/40">
        <h4 className="font-medium">Status</h4>
        {status ? (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <li>Total Jobs: {status.totalJobs}</li>
            <li>Successful: {status.successful}</li>
            <li>Failed: {status.failed}</li>
            <li>Retried: {status.retried}</li>
            <li className="col-span-2">Last Job: {status.lastJobAt || '—'}</li>
            <li className="col-span-2 text-red-500 truncate">Last Error: {status.lastError || '—'}</li>
          </ul>
        ) : <div>No status yet.</div>}
      </div>
    </div>
  );
};

/* Menu Section */
const MenuSection = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', price: '', customId: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState([]);

  // Get unique categories from existing items + custom added categories
  const availableCategories = [...new Set([
    ...items.map(item => item.category).filter(Boolean),
    ...customCategories
  ])].sort();

  useEffect(() => {
    let mounted = true;
  setLoading(true);
  fetch(apiUrl('/api/menu-items'))
      .then(async r => {
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (!mounted) return;
  const norm = (data || []).map(i => ({ id: i._id || i.id, name: i.name, category: i.category || '', price: Number(i.price || 0), available: typeof i.available === 'boolean' ? i.available : true, customId: i.customId != null ? Number(i.customId) : null, allowHalf: !!i.allowHalf, halfPrice: (i.halfPrice != null ? Number(i.halfPrice) : null) }));
        setItems(norm);
        setError(null);
      })
      .catch(err => {
        console.error('Menu fetch error', err);
        if (mounted) setError('Failed to load menu items');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const validateItem = (x) => {
    if (!x.name || String(x.name).trim() === '') return 'Name required';
    if (isNaN(Number(x.price)) || Number(x.price) <= 0) return 'Price must be > 0';
    if (x.customId !== undefined && x.customId !== null && x.customId !== '' && !Number.isFinite(Number(x.customId))) return 'ID must be a number';
    if (x.halfPrice !== undefined && x.halfPrice !== null && x.halfPrice !== '' && (isNaN(Number(x.halfPrice)) || Number(x.halfPrice) < 0)) return 'Half price must be >= 0';
    return null;
  };

  const handleAdd = async () => {
    const validationErr = validateItem({ name: form.name, price: form.price });
    if (validationErr) { setError(validationErr); return; }
    setSaving(true);
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, name: form.name, category: form.category || '', price: Number(form.price), available: true, customId: form.customId ? Number(form.customId) : null };
    setItems(prev => [optimistic, ...prev]);
    setForm({ name: '', category: '', price: '', customId: '' });
    try {
  const resp = await fetch(apiUrl('/api/menu-items'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: optimistic.name, category: optimistic.category, price: optimistic.price, available: optimistic.available, customId: optimistic.customId }) });
      if (!resp.ok) throw new Error(await resp.text());
      const saved = await resp.json();
  setItems(prev => prev.map(it => it.id === tempId ? { id: saved._id || saved.id, name: saved.name, category: saved.category, price: Number(saved.price), available: saved.available, customId: saved.customId } : it));
  try { window.dispatchEvent(new CustomEvent('menu-updated', { detail: { type: 'add', id: saved._id || saved.id } })); } catch {}
      setError(null);
    } catch (err) {
      console.error('Add menu item failed', err);
      setError('Failed to add item');
      setItems(prev => prev.filter(i => i.id !== tempId));
    } finally { setSaving(false); }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    // Include customId in editDraft so user can edit numeric ID when needed
    const { id, ...rest } = item;
    const draft = { ...rest, customId: item.customId ?? null, allowHalf: !!item.allowHalf, halfPrice: item.halfPrice ?? null };
    console.log('Starting edit for item:', item);
    console.log('Setting editDraft to:', draft);
    setEditDraft(draft);
  };
  const saveEdit = async () => {
    const validationErr = validateItem(editDraft); if (validationErr) { setError(validationErr); return; }
    const id = editingId;
    
    // Optimistically update UI
    setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...editDraft } : i));
    
    try {
      // preserve customId if present on the existing item
      const existing = items.find(i => i.id === id) || {};
      const payload = { name: editDraft.name, category: editDraft.category, price: Number(editDraft.price), available: !!editDraft.available };
      if (editDraft.customId != null) {
        payload.customId = Number(editDraft.customId);
      } else if (existing.customId != null) {
        payload.customId = existing.customId;
      }
      // Half-plate fields
      payload.allowHalf = !!editDraft.allowHalf;
      if (editDraft.halfPrice !== undefined && editDraft.halfPrice !== null && editDraft.halfPrice !== '') {
        payload.halfPrice = Number(editDraft.halfPrice);
      } else {
        payload.halfPrice = null;
      }
      console.log('Saving menu item payload:', payload);
      console.log('editDraft allowHalf:', editDraft.allowHalf, 'type:', typeof editDraft.allowHalf);
      console.log('editDraft halfPrice:', editDraft.halfPrice, 'type:', typeof editDraft.halfPrice);
  const resp = await fetch(apiUrl(`/api/menu-items/${encodeURIComponent(id)}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error(await resp.text());
      const saved = await resp.json();
  setItems(prev => prev.map(i => i.id === id ? ({ id: saved._id || saved.id, name: saved.name, category: saved.category, price: Number(saved.price), available: saved.available, customId: saved.customId, allowHalf: !!saved.allowHalf, halfPrice: (saved.halfPrice != null ? Number(saved.halfPrice) : null) }) : i));
    try { window.dispatchEvent(new CustomEvent('menu-updated', { detail: { type: 'edit', id } })); } catch {}
    try { broadcastUpdate('menu', 'edit', { id }); } catch {}
      // Clear edit state only after successful save
      setEditingId(null);
      setEditDraft({});
      setError(null);
    } catch (err) {
      console.error('Save edit failed', err);
      setError('Failed to save item');
      // Rollback optimistic update on error
      const existing = items.find(i => i.id === id);
      if (existing) {
        setItems(prev => prev.map(i => i.id === id ? existing : i));
      }
    }
  };

  // Toggle availability immediately (no Save required)
  const toggleAvailability = async (item, val) => {
    const id = item.id;
    const prev = item.available;
    // optimistic update
    setItems(prevArr => prevArr.map(i => i.id === id ? ({ ...i, available: !!val }) : i));
    try {
    const resp = await fetch(apiUrl(`/api/menu-items/${encodeURIComponent(id)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !!val })
      });
      if (!resp.ok) throw new Error(await resp.text());
  const saved = await resp.json();
  setItems(prevArr => prevArr.map(i => i.id === id ? ({ id: saved._id || saved.id, name: saved.name, category: saved.category, price: Number(saved.price), available: saved.available }) : i));
  try { window.dispatchEvent(new CustomEvent('menu-updated', { detail: { type: 'toggle', id } })); } catch {}
  try { broadcastUpdate('menu', 'toggle', { id }); } catch {}
    } catch (err) {
      console.error('Toggle availability failed', err);
      // rollback
      setItems(prevArr => prevArr.map(i => i.id === id ? ({ ...i, available: prev }) : i));
      setError('Failed to update availability');
    }
  };

  const confirmDelete = (item) => setDeleteTarget(item);
  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const id = deleteTarget.id;
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleteTarget(null);
  try { if (!String(id).startsWith('tmp-')) { const resp = await fetch(apiUrl(`/api/menu-items/${encodeURIComponent(id)}`), { method: 'DELETE' }); if (!resp.ok) throw new Error(await resp.text()); } } catch (err) { console.error('Delete failed', err); setError('Failed to delete item'); }
    try { window.dispatchEvent(new CustomEvent('menu-updated', { detail: { type: 'delete', id } })); } catch {}
    try { broadcastUpdate('menu', 'delete', { id }); } catch {}
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Menu Management</h3>
        <div className="text-sm text-muted-foreground">{items.length} items</div>
      </div>

  <div className="mb-4 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
    <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        
    {/* Category Dropdown */}
    <div className="relative">
          <select 
            className="w-full p-2 border border-border rounded bg-background text-foreground"
            value={showNewCategoryInput ? 'new-category' : form.category}
            onChange={e => {
              if (e.target.value === 'new-category') {
                setShowNewCategoryInput(true);
                setForm(f => ({ ...f, category: '' }));
              } else {
                setShowNewCategoryInput(false);
                setForm(f => ({ ...f, category: e.target.value }));
              }
            }}
          >
            <option value="">Select Category</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="new-category">+ New Category</option>
          </select>
          
          {showNewCategoryInput && (
            <div className="mt-1 flex gap-1">
              <Input 
                placeholder="Enter new category name" 
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="text-sm"
              />
              <Button 
                size="sm" 
                onClick={() => {
                  if (newCategoryName.trim()) {
                    setCustomCategories(prev => [...prev, newCategoryName.trim()]);
                    setForm(f => ({ ...f, category: newCategoryName.trim() }));
                    setNewCategoryName('');
                    setShowNewCategoryInput(false);
                  }
                }}
              >
                Add
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setShowNewCategoryInput(false);
                  setNewCategoryName('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        <Input placeholder="Price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        <Input placeholder="ID (optional)" type="number" value={form.customId} onChange={e => setForm(f => ({ ...f, customId: e.target.value }))} />
        <div className="flex items-center gap-2">
          <Button onClick={handleAdd} disabled={saving}>{saving ? 'Adding...' : 'Add item'}</Button>
          <Button variant="ghost" onClick={() => { setForm({ name: '', category: '', price: '', customId: '' }); setError(null); }}>Clear</Button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive mb-3">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading menu...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-sm text-muted-foreground border-b border-border">
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Price</th>
                  <th className="py-2 px-3">Available</th>
                  <th className="py-2 px-3">Allow Half</th>
                  <th className="py-2 px-3">Half Price</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} className={`border-b border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-white'} hover:bg-muted`}> 
                  <td className="py-2 px-3 text-sm">
                    {editingId === it.id ? (
                      <input
                        type="number"
                        className="border p-1 rounded w-20 font-mono text-sm font-medium text-primary"
                        value={editDraft.customId ?? (100 + idx)}
                        onChange={e => setEditDraft(d => ({ ...d, customId: e.target.value ? Number(e.target.value) : null }))}
                      />
                    ) : (
                      <div className="font-mono text-sm font-medium text-primary">{it.customId || (100 + idx)}</div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    {editingId === it.id ? (
                      <input className="border p-1 rounded w-full" value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                    ) : (
                      <div className="font-medium">{it.name}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {editingId === it.id ? (
                      <select 
                        className="border p-1 rounded w-full bg-background"
                        value={editDraft.category || ''}
                        onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))}
                      >
                        <option value="">Select Category</option>
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <div>{it.category}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {editingId === it.id ? (
                      <input type="number" className="border p-1 rounded w-24" value={editDraft.price} onChange={e => setEditDraft(d => ({ ...d, price: e.target.value }))} />
                    ) : (
                      <div>₹{Number(it.price).toFixed(2)}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {editingId === it.id ? (
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!editDraft.available} onChange={e => setEditDraft(d => ({ ...d, available: e.target.checked }))} />
                        <span className="text-sm">{editDraft.available ? 'Yes' : 'No'}</span>
                      </label>
                    ) : (
                      <div>
                        <button
                          className={`px-3 py-1 rounded text-sm ${it.available ? 'bg-primary text-white' : 'bg-transparent border border-border text-muted-foreground'}`}
                          onClick={() => toggleAvailability(it, !it.available)}
                          aria-pressed={it.available}
                        >
                          {it.available ? 'Available' : 'Unavailable'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {editingId === it.id ? (
                      <input 
                        type="checkbox" 
                        checked={!!editDraft.allowHalf} 
                        onChange={e => {
                          console.log('allowHalf checkbox changed to:', e.target.checked);
                          setEditDraft(d => ({ ...d, allowHalf: e.target.checked }));
                        }} 
                      />
                    ) : (
                      <div>{it.allowHalf ? 'Yes' : 'No'}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {editingId === it.id ? (
                      <input type="number" className="border p-1 rounded w-24" placeholder="auto 50%" value={editDraft.halfPrice ?? ''} onChange={e => setEditDraft(d => ({ ...d, halfPrice: e.target.value === '' ? null : Number(e.target.value) }))} />
                    ) : (
                      <div>{it.halfPrice != null ? `₹${Number(it.halfPrice).toFixed(2)}` : '-'}</div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {editingId === it.id ? (
                      <div className="inline-flex items-center rounded-md border border-border space-x-2">
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditDraft({}); }}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center rounded-md border border-border space-x-2">
                        <Button size="sm" onClick={() => startEdit(it)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => confirmDelete(it)}>Delete</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="text-sm text-muted-foreground mt-3 p-6 text-center">No menu items found. Use the form above to add a new menu item.</div>}
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete menu item" message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} loading={deleteLoading} />
    </div>
  );
};

/* Tables Section */
const TablesSection = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState({ number: '', capacity: '' });
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
  fetch(apiUrl('/api/tables'))
      .then(async r => {
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (!mounted) return;
        const normalized = (data || []).map(t => ({ id: t._id || t.id, number: t.number || t.tableNumber, capacity: t.capacity || t.seats || 0, status: t.status || 'active' }));
        setTables(normalized);
        setErr(null);
      })
      .catch(err => { console.error('Tables fetch', err); if (mounted) setErr('Failed to load tables'); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleAdd = async () => {
    if (!draft.number) { setErr('Table number required'); return; }
    setAdding(true);
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { id: tempId, number: draft.number, capacity: Number(draft.capacity || 1), status: 'active' };
    setTables(prev => [optimistic, ...prev]);
    setDraft({ number: '', capacity: '' });
    try {
  const resp = await fetch(apiUrl('/api/tables'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: optimistic.number, capacity: optimistic.capacity }) });
      if (!resp.ok) throw new Error(await resp.text());
      const saved = await resp.json();
  setTables(prev => prev.map(t => t.id === tempId ? ({ id: saved._id || saved.id, number: saved.number, capacity: saved.capacity, status: saved.status || 'active' }) : t));
  try { window.dispatchEvent(new CustomEvent('tables-updated', { detail: { type: 'add', id: saved._id || saved.id } })); } catch {}
      setErr(null);
    } catch (err) { console.error('Add table failed', err); setErr('Failed to add table'); setTables(prev => prev.filter(t => t.id !== tempId)); }
    finally { setAdding(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const id = deleteTarget.id;
    setTables(prev => prev.filter(t => t.id !== id));
    setDeleteTarget(null);
  try { if (!String(id).startsWith('tmp-')) { const resp = await fetch(apiUrl(`/api/tables/${encodeURIComponent(id)}`), { method: 'DELETE' }); if (!resp.ok) throw new Error(await resp.text()); } try { window.dispatchEvent(new CustomEvent('tables-updated', { detail: { type: 'delete', id } })); } catch {} }
    catch (err) { console.error('Table delete failed', err); setErr('Failed to delete table'); }
    finally { setDeleteLoading(false); }
  };

  const toggleActive = async (t) => {
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    setTables(prev => prev.map(row => row.id === t.id ? ({ ...row, status: newStatus }) : row));
    try {
      if (!String(t.id).startsWith('tmp-')) {
  const resp = await fetch(apiUrl(`/api/tables/${encodeURIComponent(t.id)}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
        if (!resp.ok) throw new Error(await resp.text());
  try { window.dispatchEvent(new CustomEvent('tables-updated', { detail: { type: 'toggle', id: t.id, status: newStatus } })); } catch {}
      }
    } catch (err) {
      console.error('Toggle status failed', err);
      setErr('Failed to update table status');
      setTables(prev => prev.map(row => row.id === t.id ? ({ ...row, status: t.status }) : row));
    }
  };

  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Table Management</h3>
        <div className="text-sm text-muted-foreground">{tables.length} tables</div>
      </div>

  <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
        <Input placeholder="Table number" value={draft.number} onChange={e => setDraft(d => ({ ...d, number: e.target.value }))} />
        <Input placeholder="Capacity" value={draft.capacity} onChange={e => setDraft(d => ({ ...d, capacity: e.target.value }))} />
        <div className="flex gap-2">
          <Button onClick={handleAdd} disabled={adding}>{adding ? 'Adding...' : 'Add table'}</Button>
          <Button variant="ghost" onClick={() => setDraft({ number: '', capacity: '' })}>Clear</Button>
        </div>
      </div>

      {err && <div className="text-sm text-destructive mb-3">{err}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading tables...</div>
      ) : (
        <div className="space-y-2">
          {tables.length === 0 && <div className="text-sm text-muted-foreground">No tables configured. Add one above.</div>}
          {tables.map((t, idx) => (
            <div key={t.id} className={`flex items-center justify-between border border-border rounded p-3 ${idx % 2 === 0 ? 'bg-background' : 'bg-white'} hover:bg-muted`}>
              <div>
                <div className="font-medium">Table {t.number}</div>
                <div className="text-sm text-muted-foreground">{t.capacity} • Status: {t.status}</div>
              </div>
              <div className="inline-flex items-center rounded-md border border-border space-x-2">
                <Button size="sm" onClick={() => toggleActive(t)}>{t.status === 'active' ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(t)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete table" message={`Delete table ${deleteTarget?.number}? This will remove it from the system.`} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} loading={deleteLoading} />
    </div>
  );
};

/* Bill Template */
const BillTemplateSection = () => {
  const [template, setTemplate] = useState({ restaurantName: '', address: '', gstNumber: '', fssai: '', cgst: 0, sgst: 0, serviceTax: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
  fetch(apiUrl('/api/bill-template'))
      .then(async r => {
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (!mounted) return;
        setTemplate({ restaurantName: data.restaurantName || '', address: data.address || '', gstNumber: data.gstNumber || '', fssai: data.fssai || '', cgst: Number(data.cgst || 0), sgst: Number(data.sgst || 0), serviceTax: Number(data.serviceTax || 0) });
        setErr(null);
      })
      .catch(err => { console.error('Bill template fetch', err); setErr('Failed to load bill template'); })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const validate = (t) => {
    if (!t.restaurantName || String(t.restaurantName).trim() === '') return 'Restaurant name required';
    if (t.cgst < 0 || t.sgst < 0 || t.serviceTax < 0) return 'Tax values cannot be negative';
    // Validate FSSAI if present: normalize to digits and require 14 digits
    if (t.fssai && String(t.fssai).trim() !== '') {
      const norm = String(t.fssai).replace(/\D/g, '');
      if (norm.length !== 14) return 'FSSAI must be 14 digits';
    }
    return null;
  };

  const save = async () => {
    const v = validate(template); if (v) { setErr(v); return; }
    setSaving(true);
    try {
      // normalize fssai (strip non-digits) before sending
      const payload = { ...template, fssai: template.fssai ? String(template.fssai).replace(/\D/g, '') : '' };
      const resp = await fetch(apiUrl('/api/bill-template'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!resp.ok) {
        const text = await resp.text();
        try {
          const j = JSON.parse(text);
          if (j && j.error) throw new Error(j.error);
        } catch (e) {
          throw new Error(text || 'Save failed');
        }
      }
  await resp.json(); setErr(null);
  // show transient saved state so the user sees the action completed
  try { setSaved(true); setTimeout(() => setSaved(false), 2000); } catch (e) {}
  try { broadcastUpdate('bill-template', 'updated'); } catch (e) {}
    } catch (err) { console.error('Save bill template', err); setErr(String(err?.message || err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Bill Template Settings</h3>
        <div className="text-sm text-muted-foreground">Used for printed/emailed bills</div>
      </div>

      {err && <div className="text-sm text-destructive mb-3">{err}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading template...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Restaurant Name" value={template.restaurantName} onChange={e => setTemplate(t => ({ ...t, restaurantName: e.target.value }))} />
          <Input label="GST Number" value={template.gstNumber} onChange={e => setTemplate(t => ({ ...t, gstNumber: e.target.value }))} />
          <Input label="Address" value={template.address} onChange={e => setTemplate(t => ({ ...t, address: e.target.value }))} />
          <Input label="FSSAI" value={template.fssai} onChange={e => setTemplate(t => ({ ...t, fssai: e.target.value }))} description="14 digits (you may paste with spaces or dashes)" />
          <Input label="CGST (%)" type="number" value={template.cgst} onChange={e => setTemplate(t => ({ ...t, cgst: Number(e.target.value) }))} />
          <Input label="SGST (%)" type="number" value={template.sgst} onChange={e => setTemplate(t => ({ ...t, sgst: Number(e.target.value) }))} />
          <Input label="Service Tax (%)" type="number" value={template.serviceTax} onChange={e => setTemplate(t => ({ ...t, serviceTax: Number(e.target.value) }))} />
          <div className="sm:col-span-2 flex gap-2 mt-2">
            <Button onClick={save} disabled={saving || saved}>{
              saving ? 'Saving...' : (saved ? 'Saved' : 'Save changes')
            }</Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
