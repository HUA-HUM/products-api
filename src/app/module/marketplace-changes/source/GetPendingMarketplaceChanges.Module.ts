import { Module } from '@nestjs/common';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MadreProductDeltaRepository } from 'src/core/drivers/repositories/madre-api/product-delta/MadreProductDeltaRepository';
import { GetPendingMarketplaceChanges } from 'src/core/interactors/marketplace-changes/source/GetPendingMarketplaceChanges';

@Module({
  providers: [
    MadreHttpClient,
    {
      provide: 'IMadreProductDeltaRepository',
      useClass: MadreProductDeltaRepository
    },
    GetPendingMarketplaceChanges
  ],
  exports: [GetPendingMarketplaceChanges]
})
export class GetPendingMarketplaceChangesModule {}
