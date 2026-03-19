import { MegatoneBrandResponse } from 'src/core/entitis/marketplace-api/megatone/GetBrandId/MegatoneBrandResponse';

export interface IGetBrandIdRepository {
  getByMeliBrand(meliBrand: string): Promise<MegatoneBrandResponse>;
}
