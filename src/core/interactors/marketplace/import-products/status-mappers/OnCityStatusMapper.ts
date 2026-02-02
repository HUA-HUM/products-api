import { ProductSyncStatus } from 'src/core/entitis/madre-api/product-sync/ProductSyncStatus';

export function mapOnCityStatus(status: string): ProductSyncStatus {
  switch (status) {
    case 'Activo':
      return 'ACTIVE';

    case 'Pausado':
      return 'PAUSED';

    default:
      return 'UNKNOWN';
  }
}
