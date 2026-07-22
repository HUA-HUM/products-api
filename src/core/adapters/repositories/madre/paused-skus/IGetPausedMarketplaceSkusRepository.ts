export type PausedMarketplaceSkuItem = {
  sku: string;
  paused: boolean;
};

export type PausedMarketplaceSkusResponse = {
  items: PausedMarketplaceSkuItem[];
  total: number;
};

export interface IGetPausedMarketplaceSkusRepository {
  getPausedSkus(skus: string[]): Promise<PausedMarketplaceSkusResponse>;
}
