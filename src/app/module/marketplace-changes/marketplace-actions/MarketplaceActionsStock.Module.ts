import { Module } from '@nestjs/common';
import { UpdateMegatoneStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateMegatoneStock';
import { UpdateOnCityStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateOnCityStock';
import { UpdateFravegaStock } from 'src/core/interactors/marketplace-changes/marketplace-actions/stock/UpdateFravegaStock';
import { GetProductSyncItemsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncItemsRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { UpdateMegatoneProductsRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/products/update-price-stock/UpdateMegatoneProductsRepository';
import { UpdateStockRepository as UpdateOnCityStockDriver } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-stock/UpdateStockRepository';
import { UpdateFravegaStockRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-stock/UpdateFravegaStockRepository';

@Module({
  providers: [
    UpdateMegatoneStock,
    UpdateOnCityStock,
    UpdateFravegaStock,

    MadreHttpClient,
    MarketplaceHttpClient,

    {
      provide: 'IGetProductSyncItemsRepository',
      useClass: GetProductSyncItemsRepository
    },
    {
      provide: 'IUpdateMegatoneProductsRepository',
      useClass: UpdateMegatoneProductsRepository
    },
    {
      provide: 'IUpdateOnCityStockRepository',
      useClass: UpdateOnCityStockDriver
    },
    {
      provide: 'IUpdateFravegaStockRepository',
      useClass: UpdateFravegaStockRepository
    }
  ],
  exports: [UpdateMegatoneStock, UpdateOnCityStock, UpdateFravegaStock]
})
export class MarketplaceActionsStockModule {}
