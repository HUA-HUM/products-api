import { PublishMegatoneBody } from 'src/core/entitis/marketplace-api/megatone/CreateProducts/body/PublishMegatoneBody';
import { MarketplaceHttpClient } from '../../http/MarketplaceHttpClient';
import { MegatoneCreateProductsResponse } from 'src/core/entitis/marketplace-api/megatone/CreateProducts/response/MegatoneCreateProductsResponse';

export class CreateMegatoneProductsRepository {
  constructor(private readonly http: MarketplaceHttpClient) {}

  async publish(body: PublishMegatoneBody): Promise<MegatoneCreateProductsResponse> {
    return this.http.post<MegatoneCreateProductsResponse>('/megatone/products/publish', body);
  }
}
