export interface ISendPublicationJobsRepository {
  createJobs(data: {
    run_id: number;
    jobs: {
      sku: string;
      marketplace: string;
    }[];
  }): Promise<void>;
}
