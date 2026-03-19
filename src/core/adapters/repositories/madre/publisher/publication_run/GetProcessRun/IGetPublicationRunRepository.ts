import { PublicationRun } from 'src/core/entitis/madre-api/publisher/publication_run/GetProcessRun/PublicationRun';

export interface IGetPublicationRunRepository {
  getRun(runId: number): Promise<PublicationRun>;
}
