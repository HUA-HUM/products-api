import { Module } from '@nestjs/common';
import { GetMarketplaceFavoriteSkusController } from 'src/app/controller/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkus.Controller';
import { GetMarketplaceFavoriteSkusService } from 'src/app/services/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkusService';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { GetMarketplaceFavoriteSkusRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkusRepository';
import { GetMarketplaceFavoriteSkus } from 'src/core/interactors/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkus';

@Module({
  controllers: [GetMarketplaceFavoriteSkusController],
  providers: [
    GetMarketplaceFavoriteSkusService,
    GetMarketplaceFavoriteSkus,

    MadreHttpClient,

    {
      provide: 'IGetMarketplaceFavoriteSkusRepository',
      useFactory: (http: MadreHttpClient) => {
        return new GetMarketplaceFavoriteSkusRepository(http);
      },
      inject: [MadreHttpClient]
    }
  ]
})
export class MarketplaceFavoritesModule {}
