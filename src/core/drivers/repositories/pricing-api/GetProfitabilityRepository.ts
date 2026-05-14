import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  GetProfitabilityRequest,
  GetProfitabilityResponse,
  IGetProfitabilityRepository
} from 'src/core/adapters/repositories/pricing-api/GetProfitability/IGetProfitabilityRepository';

export class GetProfitabilityRepository implements IGetProfitabilityRepository {
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly endpointPath = '/internal/getProfit/channel';

  constructor() {
    const baseURL = process.env.PRICING_API_BASE_URL;
    const apiKey = process.env.PRICING_API_KEY;

    if (!baseURL) {
      throw new Error('PRICING_API_BASE_URL is not defined');
    }

    if (!apiKey) {
      throw new Error('PRICING_API_KEY is not defined');
    }

    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async execute(params: GetProfitabilityRequest): Promise<GetProfitabilityResponse> {
    try {
      const response = await this.client.post<GetProfitabilityResponse>(this.endpointPath, params, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      const err = error as AxiosError;

      if (err.response) {
        throw new Error(
          `[PRICING POST] ${this.endpointPath} failed with status ${err.response.status}: ${JSON.stringify(err.response.data)}`
        );
      }

      throw new Error(`[PRICING POST] ${this.endpointPath} failed: ${err.message}`);
    }
  }
}
