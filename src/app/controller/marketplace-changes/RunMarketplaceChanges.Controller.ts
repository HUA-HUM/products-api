import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  RunMarketplaceChanges,
  RunMarketplaceChangesInput
} from 'src/core/interactors/marketplace-changes/run/RunMarketplaceChanges';

type RunMarketplaceChangesCronBody = Pick<RunMarketplaceChangesInput, 'limit' | 'maxPages' | 'syncKey'>;
type RunMarketplaceChangesFromIdBody = Pick<
  RunMarketplaceChangesInput,
  'afterId' | 'limit' | 'maxPages' | 'syncKey' | 'saveCursor'
>;

@ApiTags('Marketplace Changes')
@Controller('internal/marketplace-changes')
export class RunMarketplaceChangesController {
  constructor(private readonly runMarketplaceChanges: RunMarketplaceChanges) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar procesamiento de cambios de marketplaces usando cursor'
  })
  @ApiBody({
    schema: {
      example: {
        limit: 50,
        maxPages: 10,
        syncKey: 'marketplace-changes'
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso ejecutado'
  })
  async run(@Body() body: RunMarketplaceChangesCronBody = {}) {
    return this.runMarketplaceChanges.execute({
      ...body,
      useCursor: true,
      saveCursor: true
    });
  }

  @Post('run/from-id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar procesamiento manual desde un afterId específico'
  })
  @ApiBody({
    schema: {
      required: ['afterId'],
      example: {
        afterId: 0,
        limit: 50,
        maxPages: 1,
        syncKey: 'marketplace-changes',
        saveCursor: false
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso manual ejecutado'
  })
  async runFromId(@Body() body: RunMarketplaceChangesFromIdBody) {
    if (typeof body?.afterId !== 'number' || Number.isNaN(body.afterId)) {
      throw new BadRequestException('afterId is required for manual runs');
    }

    return this.runMarketplaceChanges.execute({
      ...body,
      useCursor: false
    });
  }
}
