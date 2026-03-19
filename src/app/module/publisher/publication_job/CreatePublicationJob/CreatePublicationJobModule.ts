import { Module } from '@nestjs/common';
import { CreatePublicationJobController } from 'src/app/controller/publisher/publication_job/CreatePublicationJob/CreatePublicationJob.Controller';
import { CreatePublicationJobService } from 'src/app/services/publisher/publication_job/CreatePublicationJob/CreatePublicationJobService';
import { CreatePublicationJobProcess } from 'src/core/interactors/publisher/publication_job/CreatePublicationJob/CreatePublicationJobProcess';

@Module({
  controllers: [CreatePublicationJobController],
  providers: [CreatePublicationJobService, CreatePublicationJobProcess]
})
export class CreatePublicationJobModule {}
