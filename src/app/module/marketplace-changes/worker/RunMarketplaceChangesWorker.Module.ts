import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GetPendingMarketplaceChangesModule } from '../source/GetPendingMarketplaceChanges.Module';
import { ProcessMarketplaceChangesModule } from '../process/ProcessMarketplaceChanges.Module';
import { RunMarketplaceChanges } from 'src/core/interactors/marketplace-changes/run/RunMarketplaceChanges';
import { RunMarketplaceChangesCronService } from 'src/app/services/marketplace-changes/worker/RunMarketplaceChangesCronService';
import { RunMarketplaceChangesWorkerService } from 'src/app/services/marketplace-changes/worker/RunMarketplaceChangesWorkerService';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    GetPendingMarketplaceChangesModule,
    ProcessMarketplaceChangesModule
  ],
  providers: [RunMarketplaceChanges, RunMarketplaceChangesWorkerService, RunMarketplaceChangesCronService]
})
export class RunMarketplaceChangesWorkerModule {}
