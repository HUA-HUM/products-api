import { Module } from '@nestjs/common';
import { UpdateMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateMegatonePrice';
import { UpdateOnCityPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateOnCityPrice';
import { UpdateFravegaPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateFravegaPrice';

@Module({
  providers: [UpdateMegatonePrice, UpdateOnCityPrice, UpdateFravegaPrice],
  exports: [UpdateMegatonePrice, UpdateOnCityPrice, UpdateFravegaPrice]
})
export class MarketplaceActionsPriceModule {}
