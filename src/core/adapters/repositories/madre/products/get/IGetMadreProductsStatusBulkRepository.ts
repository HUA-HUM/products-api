export type MadreProductStatusBulkItem = {
  sku: string;
  price: number;
  amazonPrice?: number;
  maxWeight?: number;
  stock: number;
  status: string;
};

export type MadreProductStatusBulkResponse = {
  items: MadreProductStatusBulkItem[];
  total: number;
};

export interface IGetMadreProductsStatusBulkRepository {
  getBySkus(skus: string[]): Promise<MadreProductStatusBulkResponse>;
}
