export type DeltaActiveInactive = 'active' | 'inactive';

const ACTIVE_VALUES = new Set(['ACTIVE']);
const INACTIVE_VALUES = new Set(['PAUSED', 'PENDING', 'INACTIVE']);

export function mapDeltaStatus(valorNuevo: string): DeltaActiveInactive {
  if (valorNuevo === null || valorNuevo === undefined || String(valorNuevo).trim() === '') {
    throw new Error('Invalid valorNuevo (empty or missing)');
  }

  const normalized = String(valorNuevo).trim().toUpperCase();

  if (ACTIVE_VALUES.has(normalized)) return 'active';
  if (INACTIVE_VALUES.has(normalized)) return 'inactive';

  throw new Error(`Invalid status (expected ACTIVE | INACTIVE | PAUSED | PENDING): ${valorNuevo}`);
}
