import { ICheckProductExistsRepository } from 'src/core/adapters/repositories/madre/Sync_items/CheckProductExists/ICheckProductExistsRepository';
import { MadreHttpClient } from '../../http/MadreHttpClient';

export class CheckProductExistsRepository implements ICheckProductExistsRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async exists(params: { marketplace: string; sellerSku: string }): Promise<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`/internal/marketplace/products/items/exists`, {
      marketplace: params.marketplace,
      sellerSku: params.sellerSku
    });
  }
}
