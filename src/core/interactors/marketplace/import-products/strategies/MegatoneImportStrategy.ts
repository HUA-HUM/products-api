import { Injectable } from '@nestjs/common';
import { mapMegatoneStatus } from '../status-mappers/MegatoneStatusMapper';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { GetMegatoneProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetMegatoneProductsAdapter';

@Injectable()
export class MegatoneImportStrategy {
  marketplace: ProductSyncMarketplace = 'megatone';

  constructor(private readonly productsRepo: GetMegatoneProductsAdapter) {}

  getProducts(limit: number, offset: number) {
    return this.productsRepo.execute(limit, offset);
  }

  mapStatus(status: string) {
    return mapMegatoneStatus(status);
  }
}
