import { Module } from '@nestjs/common';
import { MarketplaceActionsPriceModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsPrice.Module';
import { MarketplaceActionsStockModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStock.Module';
import { MarketplaceActionsStatusModule } from 'src/app/module/marketplace-changes/marketplace-actions/MarketplaceActionsStatus.Module';
import { ExecuteManualPriceUpdate } from 'src/core/interactors/marketplace-changes/manual/ExecuteManualPriceUpdate';
import { ExecuteManualStockUpdate } from 'src/core/interactors/marketplace-changes/manual/ExecuteManualStockUpdate';
import { ExecuteManualStatusUpdate } from 'src/core/interactors/marketplace-changes/manual/ExecuteManualStatusUpdate';

@Module({
  imports: [MarketplaceActionsPriceModule, MarketplaceActionsStockModule, MarketplaceActionsStatusModule],
  providers: [ExecuteManualPriceUpdate, ExecuteManualStockUpdate, ExecuteManualStatusUpdate],
  exports: [ExecuteManualPriceUpdate, ExecuteManualStockUpdate, ExecuteManualStatusUpdate]
})
export class ExecuteManualUpdateModule {}
