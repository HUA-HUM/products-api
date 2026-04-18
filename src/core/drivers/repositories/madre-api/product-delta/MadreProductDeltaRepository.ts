import { Injectable } from '@nestjs/common';
import { MadreHttpClient } from '../http/MadreHttpClient';
import { IMadreProductDeltaRepository } from 'src/core/adapters/repositories/madre/product-delta/IMadreProductDeltaRepository';
import { MadreDeltaCursor, MadreDeltaChangesResponse } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';

@Injectable()
export class MadreProductDeltaRepository implements IMadreProductDeltaRepository {
  constructor(private readonly httpClient: MadreHttpClient) {}

  async getCursor(syncKey: string): Promise<MadreDeltaCursor> {
    return this.httpClient.get<MadreDeltaCursor>('/internal/product-delta/cursor', {
      sync_key: syncKey
    });
  }

  async getChanges(params: { afterId: number; limit: number }): Promise<MadreDeltaChangesResponse> {
    return this.httpClient.get<MadreDeltaChangesResponse>('/internal/product-delta/changes', {
      after_id: params.afterId,
      limit: params.limit
    });
  }

  async saveCursor(params: { syncKey: string; lastDeltaId: number }): Promise<void> {
    await this.httpClient.post<void>('/internal/product-delta/cursor', {
      sync_key: params.syncKey,
      last_delta_id: params.lastDeltaId
    });
  }
}
