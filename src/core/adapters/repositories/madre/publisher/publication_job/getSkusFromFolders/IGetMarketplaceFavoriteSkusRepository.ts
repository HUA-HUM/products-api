export interface IGetMarketplaceFavoriteSkusRepository {
  getSkus(marketplaceId: number, page?: number, limit?: number): Promise<string[]>;
}
