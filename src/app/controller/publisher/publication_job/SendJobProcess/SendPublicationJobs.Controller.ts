import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SendPublicationJobsService } from 'src/app/services/publisher/publication_job/SendJobProcess/SendPublicationJobsService';
import { SendPublicationJobsDto } from './dto/PublicationJobDto';

@ApiTags('Publications')
@Controller('publications')
export class SendPublicationJobsController {
  constructor(private readonly service: SendPublicationJobsService) {}

  @Post('jobs')
  @ApiOperation({
    summary: 'Crear jobs de publicación en madre-api',
    description:
      'Envía una lista de jobs (SKU × marketplace) asociados a un run para ser procesados posteriormente por el worker.'
  })
  @ApiResponse({
    status: 201,
    description: 'Jobs creados correctamente'
  })
  @ApiResponse({
    status: 400,
    description: 'Error en los datos enviados'
  })
  async execute(@Body() body: SendPublicationJobsDto) {
    return this.service.execute(body);
  }
}
