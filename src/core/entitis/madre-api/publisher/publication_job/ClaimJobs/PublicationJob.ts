export interface PublicationJob {
  id: number;
  run_id?: number;
  sku: string;
  marketplace: string;
  status?: string;
}

export interface ClaimPublicationJobsResponse {
  requested: number;
  limit: number;
  claimed: number;
  items: PublicationJob[];
}
