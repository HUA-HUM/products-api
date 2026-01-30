export interface ProductSyncRunDto {
  id: string;
  marketplace: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
}

export interface IGetProductSyncRunsRepository {
  getRuns(params: { marketplace: string; offset?: number; limit?: number }): Promise<{
    items: ProductSyncRunDto[];
    offset: number;
    limit: number;
  }>;
}
