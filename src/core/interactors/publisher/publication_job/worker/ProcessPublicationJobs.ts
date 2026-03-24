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
          const updated = await this.tryUpdateJob(job.id, this.buildUpdatePayload(result));

          if (updated) {
            console.log(
              `[WORKER] Job ${job.id} ${result.status.toUpperCase()}${result.message ? ` | ${result.message}` : ''}`
            );
          }
          continue;
        }

        /* ======================================
           FAILED (controlado)
        ====================================== */
        await this.tryUpdateJob(job.id, this.buildUpdatePayload(result));

        console.error(`[WORKER] Job ${job.id} FAILED`, result.message);
      } catch (error: any) {
        console.error(`[WORKER] Job ${job.id} CRASH`, error);

        await this.tryUpdateJob(
          job.id,
          this.buildUpdatePayload({
            status: 'failed',
            message: error?.message || 'Unknown error'
          })
        );
      }
    }
  }

  private async tryUpdateJob(id: number, data: any): Promise<boolean> {
    try {
      await this.updateRepository.update(id, data);
      return true;
    } catch (error) {
      console.error(`[WORKER] Job ${id} UPDATE_STATUS_FAILED`, error, data);
      return false;
    }
  }

  private buildUpdatePayload(result: {
    status: 'success' | 'failed' | 'skipped';
    message?: string;
    payload?: any;
    response?: any;
  }) {
    return {
      status: result.status === 'failed' ? 'fail' : result.status,
      error_message: result.status === 'success' ? null : result.message ?? null,
      request_payload: result.payload ?? null,
      response_payload: result.response ?? (result.message ? { reason: result.message, status: result.status } : null),
      marketplace_item_id: this.resolveMarketplaceItemId(result.response)
    };
  }

  private resolveMarketplaceItemId(response: any): string | null {
    return (
      response?.data?.id ??
      response?.data?.publicationId ??
      response?.items?.[0]?.id ??
      response?.items?.[0]?.publicationId ??
      null
    );
  }
}
