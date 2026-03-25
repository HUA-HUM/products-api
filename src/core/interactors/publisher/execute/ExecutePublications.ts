import { Injectable } from '@nestjs/common';
import { CreatePublicationRun } from '../publication_run/CreatePublicationRun';
import { GetMarketplaceFavoriteSkus } from '../publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkus';
import { CreatePublicationJobProcess } from '../publication_job/CreatePublicationJob/CreatePublicationJobProcess';
import { SendPublicationJobs } from '../publication_job/sendJobProcess/SendPublicationJobs';

const SKUS_PAGE_SIZE = 200;
const JOBS_BATCH_SIZE = 500;

@Injectable()
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
    const seenSkus = new Set<string>();
    const jobsPreview: Array<{ sku: string; marketplace: string }> = [];
    let totalUniqueSkus = 0;
    let totalJobs = 0;
    let totalSavedBatches = 0;
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const pageResult = await this.getSkus.execute(folderId, page, SKUS_PAGE_SIZE);
      const pageSkus = pageResult.items;
      totalPages = pageResult.pagination.totalPages;

      if (!pageSkus.length) break;

      const uniquePageSkus = pageSkus.filter(sku => {
        if (seenSkus.has(sku)) {
          return false;
        }

        seenSkus.add(sku);
        return true;
      });

      totalUniqueSkus += uniquePageSkus.length;

      if (uniquePageSkus.length > 0) {
        const pageJobs = this.createJobs.execute(uniquePageSkus, marketplaces);

        if (jobsPreview.length < 10) {
          jobsPreview.push(...pageJobs.slice(0, 10 - jobsPreview.length));
        }

        totalJobs += pageJobs.length;

        const pageBatches = this.chunkJobs(pageJobs, JOBS_BATCH_SIZE);

        for (const [index, batch] of pageBatches.entries()) {
          await this.sendJobs.execute({
            run_id: Number(runId),
            jobs: batch
          });

          totalSavedBatches++;

          console.log(
            `[EXECUTE] Jobs batch saved | page=${page}/${totalPages} | batch=${index + 1}/${pageBatches.length} | size=${batch.length}`
          );
        }
      }

      page++;
    }

    console.log('[EXECUTE] SKUs fetched:', totalUniqueSkus);
    console.log('[EXECUTE] Jobs generated:', totalJobs);
    console.log('[EXECUTE] Jobs saved in Madre API | batches:', totalSavedBatches);

    /* ======================================
       RETURN (TEMP DEBUG)
    ====================================== */
    return {
      message: 'Run created',
      runId,
      totalSkus: totalUniqueSkus,
      totalJobs,
      savedBatches: totalSavedBatches,
      jobsPreview
    };
  }

  private chunkJobs<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
