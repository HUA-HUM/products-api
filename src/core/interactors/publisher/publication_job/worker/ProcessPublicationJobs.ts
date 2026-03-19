import { Inject } from '@nestjs/common';
import { IClaimJobsRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/ClaimJobs/IClaimJobsRepository';
import { IUpdateJobRepository } from 'src/core/adapters/repositories/madre/publisher/publication_job/UpdateStatus/IUpdateJobRepository';

import { PublishMegatoneProduct } from '../../megatone/PublishMegatoneProduct';
import { PublishFravegaProduct } from '../../fravega/PublishFravegaProduct';

export class ProcessPublicationJobs {
  constructor(
    @Inject('IClaimJobsRepository')
    private readonly claimRepository: IClaimJobsRepository,

    @Inject('IUpdateJobRepository')
    private readonly updateRepository: IUpdateJobRepository,

    private readonly publishMegatone: PublishMegatoneProduct,
    private readonly publishFravega: PublishFravegaProduct
  ) {}

  async execute(): Promise<void> {
    const jobs = await this.claimRepository.claim(10);

    if (!jobs.length) {
      console.log('[WORKER] No jobs to process');
      return;
    }

    for (const job of jobs) {
      try {
        console.log(`[WORKER] Processing job ${job.id} - ${job.sku} (${job.marketplace})`);

        let result;

        /* ======================================
           MARKETPLACE SWITCH
        ====================================== */
        switch (job.marketplace) {
          case 'megatone':
            result = await this.publishMegatone.execute(job.sku);
            break;

          case 'fravega':
            result = await this.publishFravega.execute(job.sku);
            break;

          default:
            throw new Error(`Marketplace not supported: ${job.marketplace}`);
        }

        /* ======================================
           SUCCESS / SKIPPED
        ====================================== */
        if (result.status === 'success' || result.status === 'skipped') {
          await this.updateRepository.update(job.id, {
            status: result.status,
            result: result.response ?? null,
            request_payload: result.payload ?? null
          });

          console.log(`[WORKER] Job ${job.id} ${result.status.toUpperCase()}`);
          continue;
        }

        /* ======================================
           FAILED (controlado)
        ====================================== */
        await this.updateRepository.update(job.id, {
          status: 'failed',
          error_message: result.message,
          result: result.response ?? null,
          request_payload: result.payload ?? null
        });

        console.error(`[WORKER] Job ${job.id} FAILED`, result.message);
      } catch (error: any) {
        console.error(`[WORKER] Job ${job.id} CRASH`, error);

        await this.updateRepository.update(job.id, {
          status: 'failed',
          error_message: error?.message || 'Unknown error'
        });
      }
    }
  }
}
