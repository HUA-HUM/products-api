import { IClaimJobsRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/ClaimJobs/IClaimJobsRepository';
import { MadreHttpClient } from '../../../http/MadreHttpClient';
import { PublicationJob } from 'src/core/entitis/madre-api/publisher/publication_job/ClaimJobs/PublicationJob';

export class ClaimJobsRepository implements IClaimJobsRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async claim(limit: number): Promise<PublicationJob[]> {
    return this.http.post<PublicationJob[]>(`/publication-jobs/claim`, { limit });
  }
}
