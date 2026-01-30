import { Injectable } from '@nestjs/common';
import { MadreHttpClient } from '../http/MadreHttpClient';
import {
  IGetProductSyncRunsRepository,
  ProductSyncRunDto
} from 'src/core/adapters/repositories/madre/product-sync/IGetProductSyncRunsRepository';

@Injectable()
export class GetProductSyncRunsRepository implements IGetProductSyncRunsRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async getRuns(params: { marketplace: string; offset?: number; limit?: number }): Promise<{
    items: ProductSyncRunDto[];
    offset: number;
    limit: number;
  }> {
    return this.http.get('/internal/product-sync/runs', {
      marketplace: params.marketplace,
      offset: params.offset ?? 0,
      limit: params.limit ?? 20
    });
  }
}
