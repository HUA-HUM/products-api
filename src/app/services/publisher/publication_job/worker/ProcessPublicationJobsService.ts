import { Inject, Injectable } from '@nestjs/common';
import { ProcessPublicationJobs } from 'src/core/interactors/publisher/publication_job/worker/ProcessPublicationJobs';

@Injectable()
export class ProcessPublicationJobsService {
  constructor(
    @Inject()
    private readonly interactor: ProcessPublicationJobs
  ) {}

  async execute() {
    await this.interactor.execute();

    return {
      message: 'Worker executed successfully'
    };
  }
}
