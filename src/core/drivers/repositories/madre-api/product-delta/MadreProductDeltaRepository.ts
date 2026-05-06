import { Injectable } from '@nestjs/common';
import { MadreHttpClient } from '../http/MadreHttpClient';
import { IMadreProductDeltaRepository } from 'src/core/adapters/repositories/madre/product-delta/IMadreProductDeltaRepository';
import { MadreDeltaCursor, MadreDeltaChangesResponse } from 'src/core/entitis/madre-api/product-delta/MadreDeltaChange';

type MadreDeltaCursorApiResponse = {
  syncKey?: string;
  lastDeltaId?: number;
  updatedAt?: string;
  sync_key?: string;
  last_delta_id?: number;
  updated_at?: string;
};

@Injectable()
export class MadreProductDeltaRepository implements IMadreProductDeltaRepository {
  private readonly internalApiKey = process.env.MADRE_INTERNAL_API_KEY ?? process.env.INTERNAL_API_KEY;

  constructor(private readonly httpClient: MadreHttpClient) {}

  async getCursor(syncKey: string): Promise<MadreDeltaCursor> {
    const cursor = await this.httpClient.get<MadreDeltaCursorApiResponse>(
      '/internal/product-delta/cursor',
      {
        sync_key: syncKey
      },
      this.getRequestOptions()
    );

    const normalizedCursor: MadreDeltaCursor = {
      syncKey: cursor.syncKey ?? cursor.sync_key ?? syncKey,
      lastDeltaId: cursor.lastDeltaId ?? cursor.last_delta_id ?? 0,
      updatedAt: cursor.updatedAt ?? cursor.updated_at
    };

    return normalizedCursor;
  }

  async getChanges(params: { afterId: number; limit: number }): Promise<MadreDeltaChangesResponse> {
    return this.httpClient.get<MadreDeltaChangesResponse>(
      '/internal/product-delta/changes',
      {
        after_id: params.afterId,
        limit: params.limit
      },
      this.getRequestOptions()
    );
  }

  async saveCursor(params: { syncKey: string; lastDeltaId: number }): Promise<void> {
    await this.httpClient.post<void>(
      '/internal/product-delta/cursor',
      {
        sync_key: params.syncKey,
        last_delta_id: params.lastDeltaId
      },
      this.getRequestOptions()
    );
  }

  private getRequestOptions() {
    if (!this.internalApiKey) {
      throw new Error('MADRE_INTERNAL_API_KEY or INTERNAL_API_KEY is not defined');
    }

    return {
      headers: {
        'x-internal-api-key': this.internalApiKey
      }
    };
  }
}
