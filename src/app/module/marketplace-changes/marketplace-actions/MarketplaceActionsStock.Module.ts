import { Module } from '@nestjs/common';
import { UpdateMegatoneStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateMegatoneStock';
import { UpdateOnCityStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateOnCityStock';
import { UpdateFravegaStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateFravegaStock';

@Module({
  providers: [UpdateMegatoneStock, UpdateOnCityStock, UpdateFravegaStock],
  exports: [UpdateMegatoneStock, UpdateOnCityStock, UpdateFravegaStock]
})
export class MarketplaceActionsStockModule {}
