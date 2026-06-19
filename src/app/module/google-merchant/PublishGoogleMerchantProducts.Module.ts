import { Module } from '@nestjs/common';
import { PublishAllGoogleMerchantProductsController } from 'src/app/controller/google-merchant/PublishAllGoogleMerchantProducts.Controller';
import { PublishAllGoogleMerchantProducts } from 'src/core/interactors/google-merchant/publish/PublishAllGoogleMerchantProducts';
import { GetGoogleMerchantActiveProductsRepository } from 'src/core/drivers/repositories/madre-api/google-merchant/GetGoogleMerchantActiveProductsRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { CreateGoogleMerchantProductRepository } from 'src/core/drivers/repositories/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRepository';
import { SendBulkProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/SendBulkProductSyncRepository';

@Module({
  controllers: [PublishAllGoogleMerchantProductsController],
  providers: [
    PublishAllGoogleMerchantProducts,
    MadreHttpClient,
    MarketplaceHttpClient,
    {
      provide: 'IGetGoogleMerchantActiveProductsRepository',
      useClass: GetGoogleMerchantActiveProductsRepository
    },
    {
      provide: 'ICreateGoogleMerchantProductRepository',
      useClass: CreateGoogleMerchantProductRepository
    },
    {
      provide: 'ISendBulkProductSyncRepository',
      useClass: SendBulkProductSyncRepository
    }
  ]
})
export class PublishGoogleMerchantProductsModule {}
