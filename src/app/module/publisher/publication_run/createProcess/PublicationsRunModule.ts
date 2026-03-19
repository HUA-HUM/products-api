import { Module } from '@nestjs/common';
import { CreatePublicationRunController } from 'src/app/controller/publisher/publication_run/CreateProcess/CreatePublicationRun.Controller';
import { CreatePublicationRunService } from 'src/app/services/publisher/publication_run/createProcess/CreatePublicationRunService';

import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { CreatePublicationRunRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_run/CreatePublicationRunRepository';
import { CreatePublicationRun } from 'src/core/interactors/publisher/publication_run/CreatePublicationRun';

@Module({
  controllers: [CreatePublicationRunController],
  providers: [
    CreatePublicationRunService,
    CreatePublicationRun,

    MadreHttpClient,

    {
      provide: 'ICreatePublicationRunRepository',
      useFactory: (http: MadreHttpClient) => {
        return new CreatePublicationRunRepository(http);
      },
      inject: [MadreHttpClient]
    }
  ]
})
export class PublicationsModule {}
