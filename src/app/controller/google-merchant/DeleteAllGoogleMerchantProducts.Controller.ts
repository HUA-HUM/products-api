import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeleteAllGoogleMerchantProducts } from 'src/core/interactors/google-merchant/delete/DeleteAllGoogleMerchantProducts';

class DeleteAllGoogleMerchantProductsBody {
  limit?: number;
  offset?: number;
  maxPages?: number;
}

@ApiTags('Google Merchant')
@Controller('internal/google-merchant/products')
export class DeleteAllGoogleMerchantProductsController {
  constructor(private readonly service: DeleteAllGoogleMerchantProducts) {}

  @Post('delete-all')
  @ApiOperation({
    summary: 'Eliminar todo el catálogo publicado en Google Merchant',
    description:
      'Recorre sync_items de Google Merchant en Madre, toma los sellerSku paginados y elimina cada producto en marketplace-api.'
  })
  @ApiBody({
    type: DeleteAllGoogleMerchantProductsBody,
    required: false
  })
  @ApiResponse({
    status: 201,
    description: 'Proceso de eliminación ejecutado'
  })
  async execute(@Body() body: DeleteAllGoogleMerchantProductsBody = {}) {
    return this.service.execute(body);
  }
}
