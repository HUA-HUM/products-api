import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapFravegaStatus(status?: string): ProductSyncStatus {
  if (!status) return 'PENDING';

  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'active':
      return 'ACTIVE';
    case 'incomplete':
      return 'PENDING';
    case 'editing':
      return 'PENDING';
    case 'paused':
      return 'PAUSED';
    case 'inactive':
      return 'PAUSED';
    case 'deleted':
      return 'DELETED';
    default:
      return 'PENDING';
  }
}

function normalizeStatus(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}
