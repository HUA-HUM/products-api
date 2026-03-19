import { Module } from '@nestjs/common';
import { GetPublicationRunController } from 'src/app/controller/publisher/publication_run/GetProcessRun/GetPublicationRun.Controller';
import { GetPublicationRunService } from 'src/app/services/publisher/publication_run/GetProcessRun/GetPublicationRunService';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { GetPublicationRunRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_run/GetProcessRun/GetPublicationRunRepository';
import { GetPublicationRun } from 'src/core/interactors/publisher/publication_run/GetProcessRun/GetPublicationRun';

@Module({
  controllers: [GetPublicationRunController],
  providers: [
    GetPublicationRunService,
    GetPublicationRun,
    MadreHttpClient,
    {
      provide: 'IGetPublicationRunRepository',
      useFactory: (http: MadreHttpClient) => {
        return new GetPublicationRunRepository(http);
      },
      inject: [MadreHttpClient]
    }
  ]
})
export class GetPublicationRunModule {}
