import { Module } from '@nestjs/common';
import { RefreshMarketplacePublishedItemsController } from 'src/app/controller/marketplace-changes/RefreshMarketplacePublishedItems.Controller';
import { RefreshMarketplacePublishedQueueService } from 'src/app/services/marketplace-changes/queues/RefreshMarketplacePublishedQueueService';
import { RefreshMarketplacePublishedWorker } from 'src/app/services/marketplace-changes/workers/RefreshMarketplacePublishedWorker';
import { GetIdProductInMarketplacesRepository } from 'src/core/drivers/repositories/madre-api/Sync_items/GetIdProductInMarketplaces/GetIdProductInMarketplacesRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { GetPausedMarketplaceSkusRepository } from 'src/core/drivers/repositories/madre-api/paused-skus/GetPausedMarketplaceSkusRepository';
import { GetMadreProductsStatusBulkRepository } from 'src/core/drivers/repositories/madre-api/products/get/GetMadreProductsStatusBulkRepository';
import { GetProductSyncItemsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncItemsRepository';
import { SendBulkProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/SendBulkProductSyncRepository';
import { MarketplaceActionsPriceModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsPrice.Module';
import { MarketplaceActionsStockModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStock.Module';
import { MarketplaceActionsStatusModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStatus.Module';
import { ExecuteManualPriceUpdate } from 'src/core/interactors/marketplace-changes/manual/ExecuteManualPriceUpdate';
import { RefreshMarketplacePublishedItems } from 'src/core/interactors/marketplace-changes/manual/RefreshMarketplacePublishedItems';
import { ExecuteManualStockUpdate } from 'src/core/interactors/marketplace-changes/manual/ExecuteManualStockUpdate';
import { ExecuteManualStatusUpdate } from 'src/core/interactors/marketplace-changes/manual/ExecuteManualStatusUpdate';

@Module({
  controllers: [RefreshMarketplacePublishedItemsController],
  imports: [MarketplaceActionsPriceModule, MarketplaceActionsStockModule, MarketplaceActionsStatusModule],
  providers: [
    ExecuteManualPriceUpdate,
    ExecuteManualStockUpdate,
    ExecuteManualStatusUpdate,
    RefreshMarketplacePublishedItems,
    RefreshMarketplacePublishedQueueService,
    RefreshMarketplacePublishedWorker,
    MadreHttpClient,
    {
      provide: 'IGetIdProductInMarketplacesRepository',
      useClass: GetIdProductInMarketplacesRepository
    },
    {
      provide: 'IGetMadreProductsStatusBulkRepository',
      useClass: GetMadreProductsStatusBulkRepository
    },
    {
      provide: 'IGetProductSyncItemsRepository',
      useClass: GetProductSyncItemsRepository
    },
    {
      provide: 'ISendBulkProductSyncRepository',
      useClass: SendBulkProductSyncRepository
    },
    {
      provide: 'IGetPausedMarketplaceSkusRepository',
      useClass: GetPausedMarketplaceSkusRepository
    }
  ],
  exports: [ExecuteManualPriceUpdate, ExecuteManualStockUpdate, ExecuteManualStatusUpdate, RefreshMarketplacePublishedItems]
})
export class ExecuteManualUpdateModule {}
