import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UpdatePriceAndStockModule } from './module/megatone/update-price-stock/UpdatePriceAndStock.Module';
import { UpdateStatusModule } from './module/megatone/update-status/UpdateStatus.Module';
import { SyncStatusModule } from './module/megatone/update-status/SyncStatus.Module';
import { ImportMarketplaceModule } from './module/marketplaces/queues/importMarketplace.Module';
import { MarketplaceFavoritesModule } from './module/publisher/publication_job/getSkusFromFolders/MarketplaceFavoritesModule';
import { CreatePublicationJobModule } from './module/publisher/publication_job/CreatePublicationJob/CreatePublicationJobModule';
import { SendPublicationJobsModule } from './module/publisher/publication_job/SendJobProcess/SendPublicationJobsModule';
import { GetPublicationRunModule } from './module/publisher/publication_run/GetProcessRun/GetPublicationRunModule';
import { PublicationsModule } from './module/publisher/publication_run/createProcess/PublicationsRunModule';
import { CancelPublicationRunModule } from './module/publisher/publication_run/CancelProcess/CancelPublicationRunModule';
import { ProcessPublicationJobsModule } from './module/publisher/publication_job/worker/ProcessPublicationJobsModule';
import { ExecutePublicationsModule } from './module/publisher/execute/ExecutePublicationsModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    UpdatePriceAndStockModule,
    UpdateStatusModule,
    SyncStatusModule,
    ImportMarketplaceModule,
    PublicationsModule,
    MarketplaceFavoritesModule,
    CreatePublicationJobModule,
    SendPublicationJobsModule,
    GetPublicationRunModule,
    CancelPublicationRunModule,
    ProcessPublicationJobsModule,
    ExecutePublicationsModule
  ]
})
export class AppModule {}
