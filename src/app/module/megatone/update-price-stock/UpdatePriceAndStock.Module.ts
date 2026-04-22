import { Module } from '@nestjs/common';
import { UpdatePriceAndStockController } from 'src/app/controller/megatone/update-price-stock/UpdatePriceAndStock.Controller';
import { UpdatePriceAndStockService } from 'src/app/services/megatone/update-price-stock/UpdatePriceAndStockService';
import { UpdatePriceAndStock } from 'src/core/interactors/megatone/update-price-stock/UpdatePriceAndStock';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { GetProductSyncItemsRepository } from 'src/core/drivers/repositories/madre-api/product-sync/GetProductSyncItemsRepository';
import { UpdateProductSyncItemRepository } from 'src/core/drivers/repositories/madre-api/product-sync/UpdateProductSyncItemRepository';
import { GetMadreProductsRepository } from 'src/core/drivers/repositories/madre-api/products/get/GetMadreProductsRepository';
import { UpdateMegatoneProductsRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/products/update-price-stock/UpdateMegatoneProductsRepository';
import { ResolveMegatonePrice } from 'src/core/interactors/marketplace-changes/marketplace-actions/price/pricing/ResolveMegatonePrice';

@Module({
  controllers: [UpdatePriceAndStockController],
  providers: [
    UpdatePriceAndStockService,
    UpdatePriceAndStock,

    MarketplaceHttpClient,
    MadreHttpClient,

    ResolveMegatonePrice,

    {
      provide: 'IGetProductSyncItemsRepository',
      useClass: GetProductSyncItemsRepository
    },
    {
      provide: 'IUpdateProductSyncItemRepository',
      useClass: UpdateProductSyncItemRepository
    },
    {
      provide: 'IGetMadreProductsRepository',
      useClass: GetMadreProductsRepository
    },
    {
      provide: 'IUpdateMegatoneProductsRepository',
      useClass: UpdateMegatoneProductsRepository
    }
  ]
})
export class UpdatePriceAndStockModule {}
