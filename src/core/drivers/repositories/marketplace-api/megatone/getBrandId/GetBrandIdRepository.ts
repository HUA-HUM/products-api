import { IGetBrandIdRepository } from 'src/core/adapters/repositories/marketplace/megatone/GetBrandId/IGetBrandIdRepository';
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MegatoneBrandResponse } from 'src/core/entitis/marketplace-api/megatone/GetBrandId/MegatoneBrandResponse';

export class GetBrandIdRepository implements IGetBrandIdRepository {
  constructor(private readonly http: MadreHttpClient) {}

  async getByMeliBrand(meliBrand: string): Promise<MegatoneBrandResponse> {
    return this.http.get<MegatoneBrandResponse>(`/matcher/brands/megatone/meli/${encodeURIComponent(meliBrand)}`);
  }
}
