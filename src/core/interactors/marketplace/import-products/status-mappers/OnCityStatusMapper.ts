import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapOnCityStatus(status?: string): ProductSyncStatus {
  if (!status) return 'ERROR';

  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'activo':
    case 'active':
      return 'ACTIVE';

    case 'pausado':
    case 'paused':
    case 'inactive':
    case 'inactivo':
      return 'PAUSED';

    case 'en_revision':
    case 'under_review':
    case 'pending_approval':
      return 'PENDING';

    case 'pending':
    case 'pendiente':
      return 'PENDING';

    case 'deleted':
    case 'eliminado':
    case 'removed':
      return 'DELETED';

    default:
      return 'ERROR';
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
