import { ICreatePublicationRunRepository } from 'src/core/adapters/repositories/madre/publisher/publication_run/ICreatePublicationRunRepository';
import { MadreHttpClient } from '../../http/MadreHttpClient';

export class CreatePublicationRunRepository implements ICreatePublicationRunRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async createRun(data: { marketplaces: string[] }): Promise<{ run_id: string; status: string }> {
    const response = await this.http.post('/publication-runs', data);

    return response.data;
  }
}
