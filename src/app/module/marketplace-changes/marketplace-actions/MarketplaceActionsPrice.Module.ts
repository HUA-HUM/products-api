import { Module } from '@nestjs/common';
import { UpdateMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateMegatonePrice';
import { UpdateOnCityPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateOnCityPrice';
import { UpdateFravegaPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/UpdateFravegaPrice';
import { ResolveMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveMegatonePrice';
import { ResolveOnCityPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveOnCityPrice';
import { ResolveFravegaPrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveFravegaPrice';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { GetProductSyncItemsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncItemsRepository';
import { UpdateMegatoneProductsRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/products/update-price-stock/UpdateMegatoneProductsRepository';
import { UpdatePriceRepository as UpdateOnCityPriceDriver } from 'src/core/drivers/repositories/marketplace-api/oncity/products/update-price/UpdatePriceRepository';
import { UpdateFravegaPriceRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/update-price/UpdateFravegaPriceRepository';
import { GetProfitabilityRepository } from 'src/core/drivers/repositories/pricing-api/GetProfitabilityRepository';

@Module({
  providers: [
    UpdateMegatonePrice,
    UpdateOnCityPrice,
    UpdateFravegaPrice,

    ResolveMegatonePrice,
    ResolveOnCityPrice,
    ResolveFravegaPrice,

    MadreHttpClient,
    MarketplaceHttpClient,
    GetProfitabilityRepository,

    {
      provide: 'IGetProductSyncItemsRepository',
      useClass: GetProductSyncItemsRepository
    },
    {
      provide: 'IUpdateMegatoneProductsRepository',
      useClass: UpdateMegatoneProductsRepository
    },
    {
      provide: 'IUpdateOnCityPriceRepository',
      useClass: UpdateOnCityPriceDriver
    },
    {
      provide: 'IUpdateFravegaPriceRepository',
      useClass: UpdateFravegaPriceRepository
    },
    {
      provide: 'IGetProfitabilityRepository',
      useClass: GetProfitabilityRepository
    }
  ],
  exports: [UpdateMegatonePrice, UpdateOnCityPrice, UpdateFravegaPrice]
})
export class MarketplaceActionsPriceModule {}
