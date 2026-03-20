export type MarketplaceFavoriteSkusPage = {
  items: string[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export interface IGetMarketplaceFavoriteSkusRepository {
  getSkus(marketplaceId: number, page?: number, limit?: number): Promise<MarketplaceFavoriteSkusPage>;
}
