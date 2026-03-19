import { CreatePublicationRun } from '../publication_run/CreatePublicationRun';
import { GetMarketplaceFavoriteSkus } from '../publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkus';
import { CreatePublicationJobProcess } from '../publication_job/CreatePublicationJob/CreatePublicationJobProcess';
import { SendPublicationJobs } from '../publication_job/sendJobProcess/SendPublicationJobs';

export class ExecutePublications {
  constructor(
    private readonly createRun: CreatePublicationRun,
    private readonly getSkus: GetMarketplaceFavoriteSkus,
    private readonly createJobs: CreatePublicationJobProcess,
    private readonly sendJobs: SendPublicationJobs
  ) {}

  async execute(params: { marketplaces: string[]; folderId: number }) {
    const { marketplaces, folderId } = params;

    /* ======================================
       1. CREATE RUN
    ====================================== */
    const run = await this.createRun.execute({
      marketplaces
    });

    const runId = run.run_id;

    console.log('[EXECUTE] Run created:', runId);

    /* ======================================
       2. GET SKUS (PAGINADO)
    ====================================== */
    const skus: string[] = [];
    let page = 1;
    const limit = 50;

    while (true) {
      const pageSkus = await this.getSkus.execute(folderId, page, limit);

      if (!pageSkus.length) break;

      skus.push(...pageSkus);
      page++;
    }

    console.log('[EXECUTE] SKUs fetched:', skus.length);

    /* ======================================
       3. BUILD JOBS (COMBINACIONES)
    ====================================== */
    const jobs = this.createJobs.execute(skus, marketplaces);

    console.log('[EXECUTE] Jobs generated:', jobs.length);

    /* ======================================
   4. SAVE JOBS
====================================== */
    await this.sendJobs.execute({
      run_id: Number(runId),
      jobs
    });

    console.log('[EXECUTE] Jobs saved in Madre API');

    /* ======================================
       RETURN (TEMP DEBUG)
    ====================================== */
    return {
      message: 'Run created',
      runId,
      totalSkus: skus.length,
      totalJobs: jobs.length,
      jobsPreview: jobs.slice(0, 10) // 👈 para no romper logs
    };
  }
}
