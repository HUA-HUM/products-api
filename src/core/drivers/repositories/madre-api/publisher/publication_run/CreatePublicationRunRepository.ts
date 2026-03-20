import { ICreatePublicationRunRepository } from 'src/core/adapters/repositories/madre/publisher/publication_run/ICreatePublicationRunRepository';
import { MadreHttpClient } from '../../http/MadreHttpClient';

type CreatePublicationRunResponse = {
  run_id: number;
  status: string;
};

export class CreatePublicationRunRepository implements ICreatePublicationRunRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async createRun(data: { marketplaces: string[] }): Promise<{ run_id: number; status: string }> {
    const response = await this.http.post<CreatePublicationRunResponse>('/publication-runs', data);

    return {
      run_id: Number(response.run_id),
      status: response.status
    };
  }
}
