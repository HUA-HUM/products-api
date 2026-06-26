import { Module } from '@nestjs/common';
import { PublishAllGoogleMerchantProductsController } from 'src/app/controller/google-merchant/PublishAllGoogleMerchantProducts.Controller';
import { GoogleMerchantPublishProductsQueueService } from 'src/app/services/google-merchant/queues/GoogleMerchantPublishProductsQueueService';
import { GoogleMerchantPublishProductsWorker } from 'src/app/services/google-merchant/workers/GoogleMerchantPublishProductsWorker';
import { GoogleMerchantProductPublisher } from 'src/core/interactors/google-merchant/publish/GoogleMerchantProductPublisher';
import { PublishAllGoogleMerchantProducts } from 'src/core/interactors/google-merchant/publish/PublishAllGoogleMerchantProducts';
import { GetGoogleMerchantActiveProductsRepository } from 'src/core/drivers/repositories/madre-api/google-merchant/GetGoogleMerchantActiveProductsRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { CreateGoogleMerchantProductRepository } from 'src/core/drivers/repositories/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRepository';
import { SendBulkProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/SendBulkProductSyncRepository';
import { CheckProductExistsRepository } from 'src/core/drivers/repositories/madre-api/Sync_items/CheckProductExists/CheckProductExistsRepository';

@Module({
  controllers: [PublishAllGoogleMerchantProductsController],
  providers: [
    PublishAllGoogleMerchantProducts,
    GoogleMerchantProductPublisher,
    GoogleMerchantPublishProductsWorker,
    MadreHttpClient,
    MarketplaceHttpClient,
    {
      provide: 'IGoogleMerchantPublishProductsQueue',
      useClass: GoogleMerchantPublishProductsQueueService
    },
    {
      provide: 'IGetGoogleMerchantActiveProductsRepository',
      useClass: GetGoogleMerchantActiveProductsRepository
    },
    {
      provide: 'ICheckProductExistsRepository',
      useClass: CheckProductExistsRepository
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
