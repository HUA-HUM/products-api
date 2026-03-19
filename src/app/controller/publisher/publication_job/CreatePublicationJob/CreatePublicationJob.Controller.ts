import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CreatePublicationJobService } from 'src/app/services/publisher/publication_job/CreatePublicationJob/CreatePublicationJobService';

class CreatePublicationJobDto {
  skus: string[];
  marketplaces: string[];
}

@ApiTags('Publications')
@Controller('publications')
export class CreatePublicationJobController {
  constructor(private readonly service: CreatePublicationJobService) {}

  @Post('jobs/preview')
  @ApiOperation({
    summary: 'Generar combinaciones SKU × marketplace',
    description:
      'Genera una lista de jobs combinando cada SKU con cada marketplace. Este endpoint solo devuelve una previsualización y no crea jobs en madre-api.'
  })
  @ApiBody({
    type: CreatePublicationJobDto,
    examples: {
      example: {
        summary: 'Ejemplo de request',
        value: {
          skus: ['B0CTPCZYR6', 'B0BQ3WMMV9'],
          marketplaces: ['fravega', 'oncity']
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Lista de jobs generados'
  })
  async execute(@Body() body: CreatePublicationJobDto) {
    return this.service.execute(body);
  }
}
