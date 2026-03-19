export type PublicationRun = {
  id: number;
  status: string;
  marketplaces: string[];
  total_jobs: number;
  success_jobs: number;
  failed_jobs: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  metadata: any;
};
