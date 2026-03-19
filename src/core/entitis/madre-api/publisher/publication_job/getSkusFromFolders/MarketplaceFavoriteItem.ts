export interface MarketplaceFavoriteItem {
  id: string;
  seller_sku: string | null;
}

export interface MarketplaceFavoritesResponse {
  data: MarketplaceFavoriteItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
