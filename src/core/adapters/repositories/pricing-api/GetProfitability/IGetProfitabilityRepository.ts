export type GetProfitabilitySalesChannel = 'megatone' | 'fravega' | 'oncity';

export type GetProfitabilityRequest = {
  sku: string;
  salePrice: number;
  salesChannel: GetProfitabilitySalesChannel;
};

export type GetProfitabilityResponse = {
  input: {
    sku: string;
    salePrice: number;
    salesChannel: string;
  };
  prices: {
    salePrice: number;
    meliContributionPercentage: number;
    meliContributionAmount: number;
    sellerNetPrice: number;
  };
  economics: {
    cost: number;
    profitAmount: number;
    profitabilityPercent: number;
    marginPercent: number;
  };
  status: {
    profitable: boolean;
    shouldPause: boolean;
  };
};

export interface IGetProfitabilityRepository {
  execute(params: GetProfitabilityRequest): Promise<GetProfitabilityResponse>;
}
