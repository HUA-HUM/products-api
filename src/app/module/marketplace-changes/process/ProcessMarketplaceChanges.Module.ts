import { Module } from '@nestjs/common';
import { MarketplaceActionsPriceModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsPrice.Module';
import { MarketplaceActionsStockModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStock.Module';
import { MarketplaceActionsStatusModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStatus.Module';
import { ProcessPriceChanges } from 'src/core/interactors/marketplace-changes/process/ProcessPriceChanges';
import { ProcessStockChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStockChanges';
import { ProcessStatusChanges } from 'src/core/interactors/marketplace-changes/process/ProcessStatusChanges';
import { ProcessMarketplaceChanges } from 'src/core/interactors/marketplace-changes/process/ProcessMarketplaceChanges';

@Module({
  imports: [MarketplaceActionsPriceModule, MarketplaceActionsStockModule, MarketplaceActionsStatusModule],
  providers: [ProcessPriceChanges, ProcessStockChanges, ProcessStatusChanges, ProcessMarketplaceChanges],
  exports: [ProcessMarketplaceChanges]
})
export class ProcessMarketplaceChangesModule {}
