import { Injectable } from '@nestjs/common';
import { CancelPublicationRun } from 'src/core/interactors/publisher/publication_run/CancelProcess/CancelPublicationRun';

@Injectable()
export class CancelPublicationRunService {
  constructor(private readonly interactor: CancelPublicationRun) {}

  async execute(runId: number) {
    return this.interactor.execute(runId);
  }
}
