import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapOnCityStatus(status?: string): ProductSyncStatus {
  if (!status) return 'PAUSED';

  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 'activo':
      return 'ACTIVE';

    case 'pausado':
      return 'PAUSED';

    default:
      return 'PAUSED';
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
