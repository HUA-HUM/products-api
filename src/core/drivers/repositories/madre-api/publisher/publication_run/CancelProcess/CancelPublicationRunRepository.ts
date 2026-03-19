import { ICancelPublicationRunRepository } from 'src/core/adapters/repositories/madre/publisher/publication_run/cancelProcess/ICancelPublicationRunRepository';
import { MadreHttpClient } from '../../../http/MadreHttpClient';

type CancelRunResponse = {
  status: string;
  jobs_cancelled: number;
};

export class CancelPublicationRunRepository implements ICancelPublicationRunRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async cancel(runId: number): Promise<CancelRunResponse> {
    const data = await this.http.post<CancelRunResponse>(`/publication-runs/${runId}/cancel`, {});

    return data;
  }
}
