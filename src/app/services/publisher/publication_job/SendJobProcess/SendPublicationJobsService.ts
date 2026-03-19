import { Injectable } from '@nestjs/common';
import { SendPublicationJobs } from 'src/core/interactors/publisher/publication_job/sendJobProcess/SendPublicationJobs';

@Injectable()
export class SendPublicationJobsService {
  constructor(private readonly interactor: SendPublicationJobs) {}

  async execute(data: { run_id: number; jobs: { sku: string; marketplace: string }[] }) {
    await this.interactor.execute(data);

    return {
      message: 'Jobs created successfully'
    };
  }
}
