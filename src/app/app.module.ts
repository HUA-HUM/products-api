import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UpdatePriceAndStockModule } from './module/megatone/update-price-stock/UpdatePriceAndStock.Module';
import { UpdateStatusModule } from './module/megatone/update-status/UpdateStatus.Module';
import { SyncStatusModule } from './module/megatone/update-status/SyncStatus.Module';
import { ImportProductsModule } from './module/marketplaces/import-products/ImportProducts.Module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    UpdatePriceAndStockModule,
    UpdateStatusModule,
    SyncStatusModule,
    ImportProductsModule
  ]
})
export class AppModule {}
