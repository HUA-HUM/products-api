import { Module } from '@nestjs/common';
import { ImportMarketplaceProducts } from 'src/core/interactors/marketplace/import-products/ImportMarketplaceProducts';
import { MegatoneImportStrategy } from 'src/core/interactors/marketplace/import-products/strategies/MegatoneImportStrategy';
import { OnCityImportStrategy } from 'src/core/interactors/marketplace/import-products/strategies/OnCityImportStrategy';
import { FravegaImportStrategy } from 'src/core/interactors/marketplace/import-products/strategies/FravegaImportStrategy';
import { MarketplaceImportStrategyResolver } from 'src/core/interactors/marketplace/import-products/factory/MarketplaceImportStrategyResolver';

import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';

import { GetMegatoneProductsRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/products/get/GetMegatoneProductsRepository';
import { GetOncityProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/get/GetOncityProductRepository';
import { GetFravegaProductsRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/products/get/GetFravegaProductsRepository';

import { GetMegatoneProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetMegatoneProductsAdapter';
import { GetOnCityProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetOnCityProductsAdapter';
import { GetFravegaProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetFravegaProductsAdapter';

import { SendBulkProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/SendBulkProductSyncRepository';
import { ProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/ProductSyncRepository';
import { GetProductSyncRunsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncRunsRepository';

@Module({
  providers: [
    MarketplaceHttpClient,
    MadreHttpClient,

    {
      provide: 'ISendBulkProductSyncRepository',
      useClass: SendBulkProductSyncRepository
    },
    {
      provide: 'IProductSyncRepository',
      useClass: ProductSyncRepository
    },
    {
      provide: 'IGetProductSyncRunsRepository',
      useClass: GetProductSyncRunsRepository
    },

    {
      provide: 'IGetMegatoneProductsRepository',
      useClass: GetMegatoneProductsRepository
    },
    {
      provide: 'IGetOncityProductRepository',
      useClass: GetOncityProductRepository
    },
    {
      provide: 'IGetFravegaProductsRepository',
      useClass: GetFravegaProductsRepository
    },

    GetMegatoneProductsAdapter,
    GetOnCityProductsAdapter,
    GetFravegaProductsAdapter,

    MegatoneImportStrategy,
    OnCityImportStrategy,
    FravegaImportStrategy,
    MarketplaceImportStrategyResolver,

    ImportMarketplaceProducts
  ],

  exports: [ImportMarketplaceProducts, 'IGetProductSyncRunsRepository']
})
export class ImportProductsModule {}
