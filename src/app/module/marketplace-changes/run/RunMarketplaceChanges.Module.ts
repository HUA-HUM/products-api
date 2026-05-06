import { Module } from '@nestjs/common';
import { RunMarketplaceChangesController } from 'src/app/controller/marketplace-changes/RunMarketplaceChanges.Controller';
import { ProcessMarketplaceChangesModule } from 'src/app/module/marketplace-changes/process/ProcessMarketplaceChanges.Module';
import { GetPendingMarketplaceChangesModule } from 'src/app/module/marketplace-changes/source/GetPendingMarketplaceChanges.Module';
import { RunMarketplaceChanges } from 'src/core/interactors/marketplace-changes/run/RunMarketplaceChanges';

@Module({
  imports: [GetPendingMarketplaceChangesModule, ProcessMarketplaceChangesModule],
  controllers: [RunMarketplaceChangesController],
  providers: [RunMarketplaceChanges]
})
export class RunMarketplaceChangesModule {}
