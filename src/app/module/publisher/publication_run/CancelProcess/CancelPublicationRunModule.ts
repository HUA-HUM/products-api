import { Module } from '@nestjs/common';
import { CancelPublicationRunController } from 'src/app/controller/publisher/publication_run/CancelProcess/CancelPublicationRun.Controller';
import { CancelPublicationRunService } from 'src/app/services/publisher/publication_run/CanelProcess/CancelPublicationRunService';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { CancelPublicationRunRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_run/CancelProcess/CancelPublicationRunRepository';
import { CancelPublicationRun } from 'src/core/interactors/publisher/publication_run/CancelProcess/CancelPublicationRun';

@Module({
  controllers: [CancelPublicationRunController],
  providers: [
    CancelPublicationRunService,
    CancelPublicationRun,
    MadreHttpClient,
    {
      provide: 'ICancelPublicationRunRepository',
      useFactory: (http: MadreHttpClient) => {
        return new CancelPublicationRunRepository(http);
      },
      inject: [MadreHttpClient]
    }
  ]
})
export class CancelPublicationRunModule {}
