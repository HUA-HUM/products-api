import { IGetFravegaAttributesRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetAtributtes/IGetFravegaAttributesRepository';
import { MadreHttpClient } from '../../../madre-api/http/MadreHttpClient';
import { FravegaCategoryAttribute } from 'src/core/entitis/marketplace-api/fravega/GetAtributtes/FravegaCategoryAttribute';

export class GetFravegaAttributesRepository implements IGetFravegaAttributesRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async getByCategoryId(categoryId: string): Promise<FravegaCategoryAttribute[]> {
    const data = await this.http.get<FravegaCategoryAttribute[]>(`/categories/fravega/attributes/${categoryId}`);

    return data;
  }
}
