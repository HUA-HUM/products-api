import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapGoogleMerchantStatus(status?: string): ProductSyncStatus {
  if (!status) return 'PENDING';

  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'active':
    case 'approved':
      return 'ACTIVE';
    case 'pending':
    case 'pending_review':
    case 'under_review':
      return 'PENDING';
    case 'disapproved':
    case 'rejected':
    case 'error':
      return 'ERROR';
    case 'paused':
    case 'inactive':
      return 'PAUSED';
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
