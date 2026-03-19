import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProcessPublicationJobsService } from 'src/app/services/publisher/publication_job/worker/ProcessPublicationJobsService';

@ApiTags('Publications Worker')
@Controller('publications/worker')
export class ProcessPublicationJobsController {
  constructor(private readonly service: ProcessPublicationJobsService) {}

  @Post('run')
  @ApiOperation({
    summary: 'Ejecutar worker manualmente',
    description: 'Ejecuta el worker de publication jobs de forma manual (uso para testing/debug)'
  })
  @ApiResponse({
    status: 200,
    description: 'Worker ejecutado correctamente'
  })
  async execute() {
    await this.service.execute();

    return {
      message: 'Worker executed manually'
    };
  }
}
