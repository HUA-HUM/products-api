import { Inject } from '@nestjs/common';
import { IGetPublicationRunRepository } from 'src/core/adapters/repositories/madre/publisher/publication_run/GetProcessRun/IGetPublicationRunRepository';

export class GetPublicationRun {
  constructor(
    @Inject('IGetPublicationRunRepository')
    private readonly repository: IGetPublicationRunRepository
  ) {}

  async execute(runId: number) {
    return this.repository.getRun(runId);
  }
}
