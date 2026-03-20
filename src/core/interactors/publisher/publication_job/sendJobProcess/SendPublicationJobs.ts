import { Inject, Injectable } from '@nestjs/common';
import { ISendPublicationJobsRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/SendJobProcess/ISendPublicationJobsRepository';

@Injectable()
export class SendPublicationJobs {
  constructor(
    @Inject('ISendPublicationJobsRepository')
    private readonly repository: ISendPublicationJobsRepository
  ) {}

  async execute(data: { run_id: number; jobs: { sku: string; marketplace: string }[] }): Promise<void> {
    await this.repository.createJobs(data);
  }
}
