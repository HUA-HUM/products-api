export interface ICreatePublicationRunRepository {
  createRun(data: { marketplaces: string[] }): Promise<{ run_id: number; status: string }>;
}
