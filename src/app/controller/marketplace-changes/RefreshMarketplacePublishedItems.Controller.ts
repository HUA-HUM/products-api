import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RefreshMarketplacePublishedItems } from 'src/core/interactors/marketplace-changes/manual/RefreshMarketplacePublishedItems';

type RefreshMarketplacePublishedItemsBody = {
  limit?: number;
  offset?: number;
  maxPages?: number;
};

@ApiTags('Marketplace Changes')
@Controller('internal/marketplace-changes/refresh-published')
export class RefreshMarketplacePublishedItemsController {
  constructor(private readonly refreshMarketplacePublishedItems: RefreshMarketplacePublishedItems) {}

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
    if (!['fravega', 'megatone', 'oncity'].includes(marketplace)) {
      throw new BadRequestException('marketplace must be one of: fravega, megatone, oncity');
    }

    return this.refreshMarketplacePublishedItems.execute({
      marketplace: marketplace as 'fravega' | 'megatone' | 'oncity',
      limit: body.limit,
      offset: body.offset,
      maxPages: body.maxPages
    });
  }
}
