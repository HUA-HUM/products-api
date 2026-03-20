import { IUpdateJobRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/UpdateStatus/IUpdateJobRepository';
import { MadreHttpClient } from '../../../http/MadreHttpClient';

export class UpdateJobRepository implements IUpdateJobRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async update(id: number, data: any) {
    await this.http.patch(`/publication-jobs/${id}`, data);
  }
}
