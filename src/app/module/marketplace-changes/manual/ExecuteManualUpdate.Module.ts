import { Module } from '@nestjs/common';
import { RefreshMarketplacePublishedItemsController } from 'src/app/controller/marketplace-changes/RefreshMarketplacePublishedItems.Controller';
import { GetIdProductInMarketplacesRepository } from 'src/core/drivers/repositories/madre-api/Sync_items/GetIdProductInMarketplaces/GetIdProductInMarketplacesRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { GetMadreProductsStatusBulkRepository } from 'src/core/drivers/repositories/madre-api/products/get/GetMadreProductsStatusBulkRepository';
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
    MadreHttpClient,
    {
      provide: 'IGetIdProductInMarketplacesRepository',
      useClass: GetIdProductInMarketplacesRepository
    },
    {
      provide: 'IGetMadreProductsStatusBulkRepository',
      useClass: GetMadreProductsStatusBulkRepository
    }
  ],
  exports: [ExecuteManualPriceUpdate, ExecuteManualStockUpdate, ExecuteManualStatusUpdate, RefreshMarketplacePublishedItems]
})
export class ExecuteManualUpdateModule {}
