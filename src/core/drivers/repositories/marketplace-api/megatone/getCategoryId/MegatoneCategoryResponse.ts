import { IGetCategoryIdRepository } from 'src/core/adapters/repositories/marketplace/megatone/GetCategoryId/IGetCategoryIdRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MegatoneCategoryResponse } from 'src/core/entitis/marketplace-api/megatone/GetCategoryId/MegatoneCategoryResponse';

export class GetCategoryIdRepository implements IGetCategoryIdRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async getByMeliCategoryId(meliCategoryId: string): Promise<MegatoneCategoryResponse> {
    return this.http.get<MegatoneCategoryResponse>(`/categories/megatone/${meliCategoryId}`);
  }
}
