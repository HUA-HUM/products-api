import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GetMarketplaceFavoriteSkusService } from 'src/app/services/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkusService';

@ApiTags('Publications')
@Controller('publications')
export class GetMarketplaceFavoriteSkusController {
  constructor(private readonly service: GetMarketplaceFavoriteSkusService) {}

  @Get('folder/:marketplaceId/skus')
  @ApiOperation({
    summary: 'Obtiene los SKUs de una carpeta',
    description: `
Devuelve los **seller_sku** asociados a una carpeta de marketplace.

Estos SKUs serán utilizados para generar los **publication jobs**.

Flujo posterior:

1. Obtener SKUs
2. Consultar detalle de cada SKU en madre-api
3. Generar publication jobs
`
  })
  @ApiParam({
    name: 'marketplaceId',
    example: 18,
    description: 'ID de la carpeta marketplace'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de SKUs',
    schema: {
      example: ['SKU123', 'SKU456', 'SKU789']
    }
  })
  async execute(
    @Param('marketplaceId') marketplaceId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.service.execute(marketplaceId, page || 1, limit || 50);
  }
}
