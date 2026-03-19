import { IGetFravegaBrandIdRepository } from 'src/core/adapters/repositories/marketplace/fravega/GetBrandId/IGetFravegaBrandIdRepository';
import { MadreHttpClient } from '../../../madre-api/http/MadreHttpClient';
import { GetFravegaBrandResponse } from 'src/core/entitis/marketplace-api/fravega/GetBrandId/GetFravegaBrandResponse';

export class GetFravegaBrandIdRepository implements IGetFravegaBrandIdRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async getByMeliBrand(brand: string): Promise<GetFravegaBrandResponse> {
    const encodedBrand = encodeURIComponent(brand);

    const data = await this.http.get<GetFravegaBrandResponse>(`/matcher/brands/fravega/meli/${encodedBrand}`);

    return data;
  }
}
