export interface ICheckProductExistsRepository {
  exists(params: { marketplace: string; sellerSku: string }): Promise<{ exists: boolean }>;
}
