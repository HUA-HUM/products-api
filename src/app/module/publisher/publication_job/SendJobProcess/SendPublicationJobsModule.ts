import { Module } from '@nestjs/common';
import { SendPublicationJobsController } from 'src/app/controller/publisher/publication_job/SendJobProcess/SendPublicationJobs.Controller';
import { SendPublicationJobsService } from 'src/app/services/publisher/publication_job/SendJobProcess/SendPublicationJobsService';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { SendPublicationJobsRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_job/sendJobProcess/SendPublicationJobsRepository';
import { SendPublicationJobs } from 'src/core/interactors/publisher/publication_job/sendJobProcess/SendPublicationJobs';

@Module({
  controllers: [SendPublicationJobsController],
  providers: [
    SendPublicationJobsService,
    MadreHttpClient,
    SendPublicationJobs,

    {
      provide: 'ISendPublicationJobsRepository',
      useFactory: (http: MadreHttpClient) => {
        return new SendPublicationJobsRepository(http);
      },
      inject: [MadreHttpClient]
    }
  ]
})
export class SendPublicationJobsModule {}
