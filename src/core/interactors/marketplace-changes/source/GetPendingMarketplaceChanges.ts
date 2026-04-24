import { Inject, Injectable } from '@nestjs/common';
import { IMadreProductDeltaRepository } from 'src/core/adapters/repositories/madre/product-delta/IMadreProductDeltaRepository';
import { MadreDeltaChangesResponse, MadreDeltaCursor } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';

@Injectable()
export class GetPendingMarketplaceChanges {
  constructor(
    @Inject('IMadreProductDeltaRepository')
    private readonly repo: IMadreProductDeltaRepository
  ) {}

  async execute(params: { afterId: number; limit: number }): Promise<MadreDeltaChangesResponse> {
    console.log(`[MKT-CHANGES] Fetch changes | afterId=${params.afterId} limit=${params.limit}`);
    return this.repo.getChanges(params);
  }

  async getCursor(syncKey: string): Promise<MadreDeltaCursor> {
    return this.repo.getCursor(syncKey);
  }

  async saveCursor(params: { syncKey: string; lastDeltaId: number }): Promise<void> {
    return this.repo.saveCursor(params);
  }
}
