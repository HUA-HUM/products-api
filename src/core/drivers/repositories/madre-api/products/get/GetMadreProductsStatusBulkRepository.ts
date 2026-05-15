import { Injectable } from '@nestjs/common';
import { MadreHttpClient } from '../../http/MadreHttpClient';
import {
  IGetMadreProductsStatusBulkRepository,
  MadreProductStatusBulkResponse
} from 'src/core/adapters/repositories/madre/products/get/IGetMadreProductsStatusBulkRepository';

@Injectable()
export class GetMadreProductsStatusBulkRepository implements IGetMadreProductsStatusBulkRepository {
  constructor(private readonly httpClient: MadreHttpClient) {}

  async getBySkus(skus: string[]): Promise<MadreProductStatusBulkResponse> {
    if (!Array.isArray(skus) || skus.length === 0) {
      throw new Error('skus is required');
    }

    return this.httpClient.post<MadreProductStatusBulkResponse>('/products/madre/status/bulk', {
      skus
    });
  }
}
