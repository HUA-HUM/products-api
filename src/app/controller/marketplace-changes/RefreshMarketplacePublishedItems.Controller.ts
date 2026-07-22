import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RefreshMarketplacePublishedQueueService } from 'src/app/services/marketplace-changes/queues/RefreshMarketplacePublishedQueueService';
import { RefreshMarketplacePublishedItems } from 'src/core/interactors/marketplace-changes/manual/RefreshMarketplacePublishedItems';

type RefreshMarketplacePublishedItemsBody = {
  limit?: number;
  offset?: number;
  maxPages?: number;
};

type RefreshMarketplacePublishedBulkBody = {
  skus: string[];
  runId?: string;
};

@ApiTags('Marketplace Changes')
@Controller('internal/marketplace-changes/refresh-published')
export class RefreshMarketplacePublishedItemsController {
  constructor(
    private readonly refreshMarketplacePublishedItems: RefreshMarketplacePublishedItems,
    private readonly refreshMarketplacePublishedQueue: RefreshMarketplacePublishedQueueService
  ) {}

  @Post(':marketplace/bulk')
  @ApiOperation({
    summary: 'Encolar refresh manual forzado de price/stock/status para varios SKUs publicados en un marketplace'
  })
  @ApiParam({
    name: 'marketplace',
    enum: ['fravega', 'megatone', 'oncity']
  })
  @ApiBody({
    schema: {
      example: {
        skus: ['ABC123', 'XYZ789'],
        runId: 'optional-run-id'
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Refresh bulk encolado'
  })
  async runBulk(@Param('marketplace') marketplace: string, @Body() body: RefreshMarketplacePublishedBulkBody) {
    const validMarketplace = this.validateMarketplace(marketplace);
    const skus = Array.isArray(body?.skus) ? body.skus.map(sku => String(sku ?? '').trim()).filter(Boolean) : [];

    if (skus.length === 0) {
      throw new BadRequestException('skus must contain at least one sku');
    }

    return this.refreshMarketplacePublishedQueue.enqueue({
      marketplace: validMarketplace,
      skus,
      runId: body.runId
    });
  }

  @Post(':marketplace/:sku')
  @ApiOperation({
    summary: 'Ejecutar refresh manual forzado de price/stock/status para un SKU publicado en un marketplace'
  })
  @ApiParam({
    name: 'marketplace',
    enum: ['fravega', 'megatone', 'oncity']
  })
  @ApiParam({
    name: 'sku',
    example: 'ABC123'
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh manual de SKU ejecutado'
  })
  async runOne(@Param('marketplace') marketplace: string, @Param('sku') sku: string) {
    const validMarketplace = this.validateMarketplace(marketplace);
    const validSku = sku?.trim();

    if (!validSku) {
      throw new BadRequestException('sku is required');
    }

    return this.refreshMarketplacePublishedItems.executeOne({
      marketplace: validMarketplace,
      sku: validSku
    });
  }

  @Post(':marketplace')
  @ApiOperation({
    summary: 'Ejecutar refresh manual forzado de price/stock/status para publicados en un marketplace'
  })
  @ApiParam({
    name: 'marketplace',
    enum: ['fravega', 'megatone', 'oncity']
  })
  @ApiBody({
    schema: {
      example: {
        limit: 100,
        offset: 0,
        maxPages: 1
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh manual ejecutado'
  })
  async run(
    @Param('marketplace') marketplace: string,
    @Body() body: RefreshMarketplacePublishedItemsBody = {}
  ) {
    const validMarketplace = this.validateMarketplace(marketplace);

    return this.refreshMarketplacePublishedItems.execute({
      marketplace: validMarketplace,
      limit: body.limit,
      offset: body.offset,
      maxPages: body.maxPages
    });
  }

  private validateMarketplace(marketplace: string): 'fravega' | 'megatone' | 'oncity' {
    if (!['fravega', 'megatone', 'oncity'].includes(marketplace)) {
      throw new BadRequestException('marketplace must be one of: fravega, megatone, oncity');
    }

    return marketplace as 'fravega' | 'megatone' | 'oncity';
  }
}
