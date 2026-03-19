import { Body, Controller, Post } from '@nestjs/common';
import { ExecutePublicationsService } from 'src/app/services/publisher/execute/ExecutePublicationsService';

@Controller('publications')
export class ExecutePublicationsController {
  constructor(private readonly service: ExecutePublicationsService) {}

  @Post('run')
  async run(
    @Body()
    body: {
      marketplaces: string[];
      folderId: number;
    }
  ) {
    return this.service.run(body);
  }
}
