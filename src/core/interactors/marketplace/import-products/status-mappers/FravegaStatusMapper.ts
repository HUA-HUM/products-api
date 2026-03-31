import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapFravegaStatus(status?: string): ProductSyncStatus {
  if (!status) return 'PENDING';

  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'active':
    case 'approved':
    case 'published':
      return 'ACTIVE';
    case 'pending_approval':
    case 'under_review':
    case 'en_revision':
    case 'review':
      return 'PENDING';
    case 'incomplete':
    case 'editing':
    case 'draft':
    case 'pending':
      return 'PENDING';
    case 'paused':
    case 'inactive':
    case 'inactivo':
      return 'PAUSED';
    case 'deleted':
    case 'eliminado':
    case 'removed':
      return 'DELETED';
    case 'rejected':
    case 'failed':
    case 'error':
      return 'ERROR';
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
