import { Module } from '@nestjs/common';
import { UpdateMegatoneStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateMegatoneStatus';
import { UpdateOnCityStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateOnCityStatus';
import { UpdateFravegaStatus } from 'src/core/interactors/marketplace-changes/marketplace-actions/status/UpdateFravegaStatus';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { GetProductSyncItemsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncItemsRepository';
import { UpdateMegatoneProductStatusRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/products/update-status/UpdateMegatoneProductStatusRepository';
import { GetOncityProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/get/GetOncityProductRepository';
import { UpdateStatusProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-status/UpdateStatusProductRepository';
import { UpdateFravegaStatusRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-status/UpdateFravegaStatusRepository';

@Module({
  providers: [
    UpdateMegatoneStatus,
    UpdateOnCityStatus,
    UpdateFravegaStatus,

    MadreHttpClient,
    MarketplaceHttpClient,

    {
      provide: 'IGetProductSyncItemsRepository',
      useClass: GetProductSyncItemsRepository
    },
    {
      provide: 'IUpdateMegatoneProductStatusRepository',
      useClass: UpdateMegatoneProductStatusRepository
    },
    {
      provide: 'IGetOnCityProductRepository',
      useClass: GetOncityProductRepository
    },
    {
      provide: 'IUpdateOnCityStatusRepository',
      useClass: UpdateStatusProductRepository
    },
    {
      provide: 'IUpdateFravegaStatusRepository',
      useClass: UpdateFravegaStatusRepository
    }
  ],
  exports: [UpdateMegatoneStatus, UpdateOnCityStatus, UpdateFravegaStatus]
})
export class MarketplaceActionsStatusModule {}
