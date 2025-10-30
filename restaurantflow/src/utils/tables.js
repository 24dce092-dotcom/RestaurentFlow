// Normalize backend table status values to UI-supported ones
// Supported UI statuses: available, occupied, billing, cleaning, reserved, needs-attention
// Mappings handled here for common variants from backend or legacy data
export function normalizeTableStatus(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'available':
    case 'active':
    case 'inactive':
    case 'idle':
      return 'available';
    case 'occupied':
    case 'busy':
    case 'seated':
      return 'occupied';
    case 'billing':
    case 'billed':
    case 'bill':
      return 'billing';
    case 'cleaning':
    case 'cleanup':
      return 'cleaning';
    case 'reserved':
    case 'hold':
      return 'reserved';
    case 'needs-attention':
    case 'attention':
    case 'alert':
      return 'needs-attention';
    case 'running':
    case 'in-progress':
    case 'running-order':
      // Treat running/in-progress orders as occupied for UI consistency
      return 'occupied';
    default:
      return 'available';
  }
}

export function normalizeTables(tables) {
  return (tables || []).map(t => ({
    ...t,
    status: normalizeTableStatus(t?.status)
  }));
}
