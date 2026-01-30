import { Module } from '@nestjs/common';
import { ImportMarketplaceProducts } from 'src/core/interactors/marketplace/import-products/ImportMarketplaceProducts';
import { MegatoneImportStrategy } from 'src/core/interactors/marketplace/import-products/strategies/MegatoneImportStrategy';
import { OnCityImportStrategy } from 'src/core/interactors/marketplace/import-products/strategies/OnCityImportStrategy';
import { MarketplaceImportStrategyResolver } from 'src/core/interactors/marketplace/import-products/factory/MarketplaceImportStrategyResolver';

import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';

import { GetMegatoneProductsRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/products/get/GetMegatoneProductsRepository';
import { GetOncityProductRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/products/get/GetOncityProductRepository';

import { GetMegatoneProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetMegatoneProductsAdapter';
import { GetOnCityProductsAdapter } from 'src/core/drivers/repositories/marketplace-api/marketplace/import-products/GetOnCityProductsAdapter';

import { SendBulkProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/SendBulkProductSyncRepository';
import { ProductSyncRepository } from 'src/core/drivers/repositories/madre-api/product-sync/ProductSyncRepository';

@Module({
  // ❌ NO imports
  // ❌ NO controllers

  providers: [
    /* ----------------------------- HTTP ----------------------------- */
    MarketplaceHttpClient,
    MadreHttpClient,

    /* ----------------------------- Madre ---------------------------- */
    {
      provide: 'ISendBulkProductSyncRepository',
      useClass: SendBulkProductSyncRepository
    },
    {
      provide: 'IProductSyncRepository',
      useClass: ProductSyncRepository
    },

    /* ----------------------------- Megatone ------------------------- */
    {
      provide: 'IGetMegatoneProductsRepository',
      useClass: GetMegatoneProductsRepository
    },

    /* ----------------------------- OnCity --------------------------- */
    {
      provide: 'IGetOncityProductRepository',
      useClass: GetOncityProductRepository
    },

    /* ----------------------------- Adapters ------------------------- */
    GetMegatoneProductsAdapter,
    GetOnCityProductsAdapter,

    /* ----------------------------- Strategies ----------------------- */
    MegatoneImportStrategy,
    OnCityImportStrategy,
    MarketplaceImportStrategyResolver,

    /* ----------------------------- Interactor ----------------------- */
    ImportMarketplaceProducts
  ],

  exports: [ImportMarketplaceProducts]
})
export class ImportProductsModule {}
