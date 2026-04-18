import { Module } from '@nestjs/common';
import { UpdateMegatoneStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateMegatoneStatus';
import { UpdateOnCityStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateOnCityStatus';
import { UpdateFravegaStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateFravegaStatus';

@Module({
  providers: [UpdateMegatoneStatus, UpdateOnCityStatus, UpdateFravegaStatus],
  exports: [UpdateMegatoneStatus, UpdateOnCityStatus, UpdateFravegaStatus]
})
export class MarketplaceActionsStatusModule {}
