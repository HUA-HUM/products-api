import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { GetPublicationRunService } from 'src/app/services/publisher/publication_run/GetProcessRun/GetPublicationRunService';

@ApiTags('Publications')
@Controller('publications')
export class GetPublicationRunController {
  constructor(private readonly service: GetPublicationRunService) {}

  @Get('run/:id')
  @ApiOperation({
    summary: 'Obtener estado de un publication run',
    description: 'Devuelve el estado y progreso de un proceso de publicación'
  })
  @ApiParam({
    name: 'id',
    example: 4,
    description: 'ID del publication run'
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del run'
  })
  async execute(@Param('id', ParseIntPipe) id: number) {
    return this.service.execute(id);
  }
}
