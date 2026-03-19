import { Inject, Injectable } from '@nestjs/common';
import { CreatePublicationRun } from 'src/core/interactors/publisher/publication_run/CreatePublicationRun';

@Injectable()
export class CreatePublicationRunService {
  constructor(private readonly interactor: CreatePublicationRun) {}

  async execute(data: { marketplaces: string[] }) {
    return this.interactor.execute(data);
  }
}
