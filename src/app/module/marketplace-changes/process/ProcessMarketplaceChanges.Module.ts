import { Module } from '@nestjs/common';
import { MarketplaceActionsPriceModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsPrice.Module';
import { MarketplaceActionsStockModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStock.Module';
import { MarketplaceActionsStatusModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStatus.Module';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { GetPausedMarketplaceSkusRepository } from 'src/core/drivers/repositories/madre-api/paused-skus/GetPausedMarketplaceSkusRepository';
import { GetProductSyncItemsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncItemsRepository';
import { SendBulkProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/SendBulkProductSyncRepository';
import { ProcessPriceChanges } from 'src/core/interactors/marketplace-changes/process/ProcessPriceChanges';
import { ProcessStockChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStockChanges';
import { ProcessStatusChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStatusChanges';
import { ProcessMarketplaceChanges } from 'src/core/interactors/marketplace-changes/process/ProcessMarketplaceChanges';

@Module({
  imports: [MarketplaceActionsPriceModule, MarketplaceActionsStockModule, MarketplaceActionsStatusModule],
  providers: [
    ProcessPriceChanges,
    ProcessStockChanges,
    ProcessStatusChanges,
    ProcessMarketplaceChanges,
    MadreHttpClient,
    {
      provide: 'IGetPausedMarketplaceSkusRepository',
      useClass: GetPausedMarketplaceSkusRepository
    },
    {
      provide: 'IGetProductSyncItemsRepository',
      useClass: GetProductSyncItemsRepository
    },
    {
      provide: 'ISendBulkProductSyncRepository',
      useClass: SendBulkProductSyncRepository
    }
  ],
  exports: [ProcessMarketplaceChanges]
})
export class ProcessMarketplaceChangesModule {}
