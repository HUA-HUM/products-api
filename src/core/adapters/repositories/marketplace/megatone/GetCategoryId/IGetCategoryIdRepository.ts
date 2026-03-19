import { MegatoneCategoryResponse } from 'src/core/entitis/marketplace-api/megatone/GetCategoryId/MegatoneCategoryResponse';

export interface IGetCategoryIdRepository {
  getByMeliCategoryId(meliCategoryId: string): Promise<MegatoneCategoryResponse>;
}
