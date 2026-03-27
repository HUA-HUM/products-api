import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapMegatoneStatus(status?: string): ProductSyncStatus {
  if (!status) return 'ERROR';

  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'activo':
    case 'active':
      return 'ACTIVE';

    case 'en_revision':
    case 'under_review':
      return 'EN_REVISION';

    case 'pausado':
    case 'paused':
    case 'inactive':
    case 'inactivo':
      return 'PAUSED';

    case 'pendiente_activacion':
    case 'pending_activation':
    case 'pending':
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
