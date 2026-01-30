import { Controller, Post, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImportMarketplaceService } from 'src/app/services/queues/import-marketplace.service';

import { ProductSyncMarketplace } from 'src/core/entitis/madre-api/product-sync/ProductSyncMarketplace';

@ApiTags('Import Products from Marketplaces')
@Controller('internal/import')
export class MarketplaceImportController {
  constructor(private readonly importMarketplaceService: ImportMarketplaceService) {}

  /* =========================
     MANUAL
  ========================= */

  @Post(':marketplace/run')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ejecutar sincronización manual de productos'
  })
  @ApiResponse({
    status: 202,
    description: 'Sincronización encolada'
  })
  async runManual(@Param('marketplace') marketplace: ProductSyncMarketplace) {
    await this.importMarketplaceService.enqueueImport(marketplace);

    return {
      status: 'QUEUED',
      marketplace
    };
  }

  /* =========================
     CRON
  ========================= */

  @Post(':marketplace/cron')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Ejecutar sincronización automática (cron)'
  })
  @ApiResponse({
    status: 204,
    description: 'Sincronización encolada'
  })
  async runCron(@Param('marketplace') marketplace: ProductSyncMarketplace): Promise<void> {
    await this.importMarketplaceService.enqueueImport(marketplace);
  }
}
