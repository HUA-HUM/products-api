import { PublicationJob } from 'src/core/entitis/madre-api/publisher/publication_job/ClaimJobs/PublicationJob';

export interface IClaimJobsRepository {
  claim(limit: number): Promise<PublicationJob[]>;
}
