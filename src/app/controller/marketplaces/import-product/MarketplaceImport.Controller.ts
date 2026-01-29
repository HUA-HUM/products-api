import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ImportMarketplaceProducts } from 'src/core/interactors/marketplace/import-products/ImportMarketplaceProducts';

@ApiTags('Import Products from Marketplaces')
@Controller('internal/import')
export class MarketplaceImportController {
  constructor(private readonly importMarketplaceProducts: ImportMarketplaceProducts) {}

  /* =========================
     MEGATONE (MANUAL)
  ========================= */

  @Post('megatone/run')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ejecutar sincronización de productos desde Megatone'
  })
  @ApiResponse({
    status: 202,
    description: 'Sincronización Megatone iniciada'
  })
  runMegatoneManual(): { status: 'STARTED' } {
    this.importMarketplaceProducts.execute('megatone').catch(() => {});

    return { status: 'STARTED' };
  }

  /* =========================
     MEGATONE (CRON)
  ========================= */

  @Post('megatone/cron')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Sincronización automática Megatone (cron)'
  })
  @ApiResponse({
    status: 204,
    description: 'Sincronización Megatone disparada'
  })
  runMegatoneCron(): void {
    this.importMarketplaceProducts.execute('megatone').catch(() => {});
  }

  /* =========================
     ONCITY (MANUAL)
  ========================= */

  @Post('oncity/run')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ejecutar sincronización de productos desde OnCity'
  })
  @ApiResponse({
    status: 202,
    description: 'Sincronización OnCity iniciada'
  })
  runOnCityManual(): { status: 'STARTED' } {
    this.importMarketplaceProducts.execute('oncity').catch(() => {});

    return { status: 'STARTED' };
  }

  /* =========================
     ONCITY (CRON)
  ========================= */

  @Post('oncity/cron')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Sincronización automática OnCity (cron)'
  })
  @ApiResponse({
    status: 204,
    description: 'Sincronización OnCity disparada'
  })
  runOnCityCron(): void {
    this.importMarketplaceProducts.execute('oncity').catch(() => {});
  }
}
