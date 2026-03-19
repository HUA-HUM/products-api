import { IGetPublicationRunRepository } from 'src/core/adapters/repositories/madre/publisher/publication_run/GetProcessRun/IGetPublicationRunRepository';
import { MadreHttpClient } from '../../../http/MadreHttpClient';
import { PublicationRun } from 'src/core/entitis/madre-api/publisher/publication_run/GetProcessRun/PublicationRun';

type MadrePublicationRunResponse = {
  id: string;
  status: string;
  marketplaces: string[];
  total_jobs: number;
  success_jobs: number;
  failed_jobs: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  metadata: any;
};

export class GetPublicationRunRepository implements IGetPublicationRunRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async getRun(runId: number): Promise<PublicationRun> {
    const data = await this.http.get<MadrePublicationRunResponse>(`/publication-runs/${runId}`);

    return {
      id: Number(data.id),
      status: data.status,
      marketplaces: data.marketplaces,
      total_jobs: data.total_jobs,
      success_jobs: data.success_jobs,
      failed_jobs: data.failed_jobs,
      created_at: data.created_at,
      started_at: data.started_at,
      finished_at: data.finished_at,
      metadata: data.metadata
    };
  }
}
