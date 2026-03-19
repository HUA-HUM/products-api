import { Inject } from '@nestjs/common';
import { ICreatePublicationRunRepository } from 'src/core/adapters/repositories/madre/publisher/publication_run/ICreatePublicationRunRepository';

export class CreatePublicationRun {
  constructor(
    @Inject('ICreatePublicationRunRepository')
    private readonly repository: ICreatePublicationRunRepository
  ) {}

  async execute(data: { marketplaces: string[] }) {
    if (!data.marketplaces || data.marketplaces.length === 0) {
      throw new Error('marketplaces are required');
    }

    const run = await this.repository.createRun({
      marketplaces: data.marketplaces
    });

    return run;
  }
}
