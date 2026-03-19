import { Injectable } from '@nestjs/common';
import { GetPublicationRun } from 'src/core/interactors/publisher/publication_run/GetProcessRun/GetPublicationRun';

@Injectable()
export class GetPublicationRunService {
  constructor(private readonly interactor: GetPublicationRun) {}

  async execute(runId: number) {
    const run = await this.interactor.execute(runId);

    return run;
  }
}
