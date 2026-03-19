export interface ICancelPublicationRunRepository {
  cancel(runId: number): Promise<{
    status: string;
    jobs_cancelled: number;
  }>;
}
