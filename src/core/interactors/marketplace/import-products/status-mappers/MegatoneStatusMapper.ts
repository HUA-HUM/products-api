import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapMegatoneStatus(status?: string): ProductSyncStatus {
  if (!status) return 'DELETED';

  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'activo':
    case 'active':
      return 'ACTIVE';

    case 'en_revision':
    case 'en_revision_de_aprobacion':
    case 'en_revision_aprobacion':
    case 'under_review':
    case 'under_review_approval':
      return 'EN_REVISION';

    case 'pausado':
    case 'paused':
    case 'inactive':
    case 'inactivo':
      return 'PAUSED';

    case 'pendiente_activacion':
    case 'pendiente_de_activacion':
    case 'pending_activation':
    case 'pending_for_activation':
    case 'pending_activation_approval':
    case 'pendiente_aprobacion':
    case 'pendiente_de_aprobacion':
      return 'EN_REVISION';

    case 'pending':
      return 'PENDING';

    case 'deleted':
    case 'eliminado':
    case 'removed':
      return 'DELETED';

    default:
      return 'DELETED';
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
