export type MarketplaceProductIdAndSkuMarketplace = 'fravega' | 'megatone' | 'oncity';

export type MarketplaceProductIdAndSkuItem = {
  id: string;
  sellerSku: string;
};

export type MarketplaceProductIdsAndSkusResponse = {
  items: MarketplaceProductIdAndSkuItem[];
  limit: number;
  offset: number;
  count: number;
  total: number;
  hasNext: boolean;
  nextOffset: number | null;
};

export interface IGetIdProductInMarketplacesRepository {
  list(params: {
    marketplace: MarketplaceProductIdAndSkuMarketplace;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceProductIdsAndSkusResponse>;
}
