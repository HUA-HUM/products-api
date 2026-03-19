import { Injectable } from '@nestjs/common';
import { CreatePublicationJobProcess } from 'src/core/interactors/publisher/publication_job/CreatePublicationJob/CreatePublicationJobProcess';

@Injectable()
export class CreatePublicationJobService {
  constructor(private readonly process: CreatePublicationJobProcess) {}

  async execute(data: { skus: string[]; marketplaces: string[] }) {
    const jobs = this.process.execute(data.skus, data.marketplaces);

    return {
      total_jobs: jobs.length,
      jobs
    };
  }
}
