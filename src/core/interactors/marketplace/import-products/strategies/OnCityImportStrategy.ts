import { Injectable } from '@nestjs/common';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { mapOnCityStatus } from '../status-mappers/OnCityStatusMapper';
import { GetOnCityProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetOnCityProductsAdapter';

@Injectable()
export class OnCityImportStrategy {
  marketplace: ProductSyncMarketplace = 'oncity';

  constructor(private readonly productsRepo: GetOnCityProductsAdapter) {}

  getProducts(limit: number, offset: number) {
    return this.productsRepo.execute(limit, offset);
  }

  mapStatus(status: string) {
    return mapOnCityStatus(status);
  }
}
