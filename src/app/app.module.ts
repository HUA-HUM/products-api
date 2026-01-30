import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UpdatePriceAndStockModule } from './module/megatone/update-price-stock/UpdatePriceAndStock.Module';
import { UpdateStatusModule } from './module/megatone/update-status/UpdateStatus.Module';
import { SyncStatusModule } from './module/megatone/update-status/SyncStatus.Module';
import { ImportMarketplaceModule } from './module/marketplaces/queues/importMarketplace.Module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    UpdatePriceAndStockModule,
    UpdateStatusModule,
    SyncStatusModule,
    ImportMarketplaceModule
  ]
})
export class AppModule {}
