import { Inject } from '@nestjs/common';
import { ICancelPublicationRunRepository } from 'src/core/adapters/repositories/madre/publisher/publication_run/cancelProcess/ICancelPublicationRunRepository';

export class CancelPublicationRun {
  constructor(
    @Inject('ICancelPublicationRunRepository')
    private readonly repository: ICancelPublicationRunRepository
  ) {}

  async execute(runId: number) {
    return this.repository.cancel(runId);
  }
}
