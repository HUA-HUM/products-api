import { Controller, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CancelPublicationRunService } from 'src/app/services/publisher/publication_run/CanelProcess/CancelPublicationRunService';

@ApiTags('Publications')
@Controller('publications')
export class CancelPublicationRunController {
  constructor(private readonly service: CancelPublicationRunService) {}

  @Post('run/:id/cancel')
  @ApiOperation({
    summary: 'Cancelar un publication run',
    description: 'Cancela todos los jobs pendientes asociados a un run en madre-api.'
  })
  @ApiParam({
    name: 'id',
    example: 5,
    description: 'ID del publication run'
  })
  @ApiResponse({
    status: 200,
    description: 'Run cancelado correctamente',
    schema: {
      example: {
        status: 'cancelled',
        jobs_cancelled: 10
      }
    }
  })
  async execute(@Param('id') id: string) {
    return this.service.execute(Number(id));
  }
}
