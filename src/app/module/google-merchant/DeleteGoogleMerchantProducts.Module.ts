import { Module } from '@nestjs/common';
import { DeleteAllGoogleMerchantProductsController } from 'src/app/controller/google-merchant/DeleteAllGoogleMerchantProducts.Controller';
import { DeleteAllGoogleMerchantProducts } from 'src/core/interactors/google-merchant/delete/DeleteAllGoogleMerchantProducts';
import { GetIdProductInMarketplacesRepository } from 'src/core/drivers/repositories/madre-api/Sync_items/GetIdProductInMarketplaces/GetIdProductInMarketplacesRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { GetProductSyncItemsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncItemsRepository';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { DeleteGoogleMerchantProductRepository } from 'src/core/drivers/repositories/marketplace-api/google-merchant/products/delete/DeleteGoogleMerchantProductRepository';

@Module({
  controllers: [DeleteAllGoogleMerchantProductsController],
  providers: [
    DeleteAllGoogleMerchantProducts,
    MadreHttpClient,
    MarketplaceHttpClient,
    {
      provide: 'IGetIdProductInMarketplacesRepository',
      useClass: GetIdProductInMarketplacesRepository
    },
    {
      provide: 'IGetProductSyncItemsRepository',
      useClass: GetProductSyncItemsRepository
    },
    {
      provide: 'IDeleteGoogleMerchantProductRepository',
      useClass: DeleteGoogleMerchantProductRepository
    }
  ]
})
export class DeleteGoogleMerchantProductsModule {}
