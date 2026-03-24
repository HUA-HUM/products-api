import { Injectable } from '@nestjs/common';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { mapFravegaStatus } from '../status-mappers/FravegaStatusMapper';
import { GetFravegaProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetFravegaProductsAdapter';

@Injectable()
export class FravegaImportStrategy {
  marketplace: ProductSyncMarketplace = 'fravega';

  constructor(private readonly productsRepo: GetFravegaProductsAdapter) {}

  getProducts(limit: number, offset: number) {
    return this.productsRepo.execute(limit, offset);
  }

  mapStatus(status: string) {
    return mapFravegaStatus(status);
  }
}
