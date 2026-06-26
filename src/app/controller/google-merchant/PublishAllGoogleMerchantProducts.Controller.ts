import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublishAllGoogleMerchantProducts } from 'src/core/interactors/google-merchant/publish/PublishAllGoogleMerchantProducts';

class PublishAllGoogleMerchantProductsBody {
  limit?: number;
  offset?: number;
  maxPages?: number;
  runId?: string;
}

@ApiTags('Google Merchant')
@Controller('internal/google-merchant/products')
export class PublishAllGoogleMerchantProductsController {
  constructor(private readonly service: PublishAllGoogleMerchantProducts) {}

  @Post('publish-all')
  @ApiOperation({
    summary: 'Publicar masivamente productos activos en Google Merchant',
    description:
      'Consulta los productos activos desde Madre API y encola un job BullMQ por producto para publicarlo/upsertearlo en Google Merchant.'
  })
  @ApiBody({
    type: PublishAllGoogleMerchantProductsBody,
    required: false
  })
  @ApiResponse({
    status: 201,
    description: 'Proceso de publicación ejecutado'
  })
  async execute(@Body() body: PublishAllGoogleMerchantProductsBody = {}) {
    return this.service.execute(body);
  }
}
