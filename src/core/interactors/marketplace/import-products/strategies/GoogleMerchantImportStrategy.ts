import { Injectable } from '@nestjs/common';
import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';
import { GetGoogleMerchantProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetGoogleMerchantProductsAdapter';
import { mapGoogleMerchantStatus } from '../status-mappers/GoogleMerchantStatusMapper';

@Injectable()
export class GoogleMerchantImportStrategy {
  marketplace: ProductSyncMarketplace = 'google-merchant';
  fetchBatchLimit = 25;

  constructor(private readonly productsRepo: GetGoogleMerchantProductsAdapter) {}

  getProducts(limit: number, offset: number) {
    return this.productsRepo.execute(limit, offset);
  }

  mapStatus(status: string) {
    return mapGoogleMerchantStatus(status);
  }
}
