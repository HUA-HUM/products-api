import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiConsumes } from '@nestjs/swagger';

import { CreatePublicationRunDTO } from './dto/CreatePublicationRunDTO';
import { CreatePublicationRunService } from 'src/app/services/publisher/publication_run/createProcess/CreatePublicationRunService';

@ApiTags('Publications')
@Controller('publications')
export class CreatePublicationRunController {
  constructor(private readonly service: CreatePublicationRunService) {}

  @Post('run')
  @ApiOperation({
    summary: 'Inicia un proceso de publicación masiva',
    description: `
Crea un **publication run** en **madre-api** que representará un proceso completo de publicación.

Flujo del proceso:

1. Se crea un **run** en madre-api
2. Luego se obtendrán los **SKUs publicables**
3. Se generarán los **publication jobs**
4. Los workers procesarán cada publicación

📌 Notas:
- Este endpoint **no publica productos todavía**
- Solo inicializa el proceso de publicación
`
  })
  @ApiConsumes('application/json')
  @ApiBody({
    type: CreatePublicationRunDTO,
    description: 'Marketplaces donde se realizará la publicación'
  })
  @ApiResponse({
    status: 201,
    description: 'Publication run creado correctamente',
    schema: {
      example: {
        run_id: 4,
        status: 'created'
      }
    }
  })
  async execute(@Body() body: CreatePublicationRunDTO) {
    return this.service.execute(body);
  }
}
