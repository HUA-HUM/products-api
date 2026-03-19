import { ICreateFravegaProductsRepository } from 'src/core/adapters/repositories/marketplace/fravega/CreateProduct/ICreateFravegaProductsRepository';
import { CreateFravegaProductsResponse } from 'src/core/entitis/marketplace-api/fravega/CreateProducts/CreateFravegaProductsResponse';
import { MarketplaceHttpClient } from '../../http/MarketplaceHttpClient';

export class CreateFravegaProductsRepository implements ICreateFravegaProductsRepository {
  constructor(private readonly http: MarketplaceHttpClient) {}

  async create(body: any): Promise<CreateFravegaProductsResponse> {
    try {
      const response = await this.http.post<any>('/fravega/products', body);

      /* ======================================
         MAP RESPONSE (ajustamos después)
      ====================================== */
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'FRAVEGA_API_ERROR',
        error
      };
    }
  }
}
