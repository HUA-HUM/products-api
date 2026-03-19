import { PublishMegatoneBody } from 'src/core/entitis/marketplace-api/megatone/CreateProducts/body/PublishMegatoneBody';
import { MegatoneCreateProductsResponse } from 'src/core/entitis/marketplace-api/megatone/CreateProducts/response/MegatoneCreateProductsResponse';

export interface ICreateMegatoneProductsRepository {
  publish(body: PublishMegatoneBody): Promise<MegatoneCreateProductsResponse>;
}
