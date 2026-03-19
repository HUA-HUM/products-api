import { Injectable } from '@nestjs/common';
import { ExecutePublications } from 'src/core/interactors/publisher/execute/ExecutePublications';

@Injectable()
export class ExecutePublicationsService {
  constructor(private readonly executePublications: ExecutePublications) {}

  async run(data: { marketplaces: string[]; folderId: number }) {
    return this.executePublications.execute(data);
  }
}
