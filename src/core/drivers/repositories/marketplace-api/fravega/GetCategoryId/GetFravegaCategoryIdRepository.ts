import { IGetFravegaCategoryIdRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetCategoryId/IGetFravegaCategoryIdRepository';
import { GetFravegaCategoryIdResponse } from 'src/core/entitis/marketplace-api/fravega/GetCategoryId/GetFravegaCategoryIdResponse';
import { MadreHttpClient } from '../../../madre-api/http/MadreHttpClient';

export class GetFravegaCategoryIdRepository implements IGetFravegaCategoryIdRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async getByMeliCategoryId(meliCategoryId: string): Promise<GetFravegaCategoryIdResponse> {
    const data = await this.http.get<GetFravegaCategoryIdResponse>(`/categories/fravega/match/${meliCategoryId}`);

    return data;
  }
}
