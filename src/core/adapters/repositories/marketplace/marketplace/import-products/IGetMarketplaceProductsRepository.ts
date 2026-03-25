export interface IGetMarketplaceProductsRepository {
  execute(
    limit: number,
    offset: number
  ): Promise<{
    items: {
      publicationId: number | string;
      sellerSku: string;
      marketSku?: string | null;
      price: number;
      stock: number;
      status: string;
      raw?: unknown;
    }[];
    hasNext: boolean;
    nextOffset?: number;
  }>;
}
