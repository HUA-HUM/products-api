import { ISendPublicationJobsRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/SendJobProcess/ISendPublicationJobsRepository';
import { MadreHttpClient } from '../../../http/MadreHttpClient';

export class SendPublicationJobsRepository implements ISendPublicationJobsRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async createJobs(data: { run_id: number; jobs: { sku: string; marketplace: string }[] }): Promise<void> {
    await this.http.post('/publication-jobs', data);
  }
}
