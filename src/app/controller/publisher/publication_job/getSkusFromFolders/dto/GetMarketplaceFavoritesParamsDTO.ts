import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetMarketplaceFavoritesParamsDTO {
  @ApiProperty({
    example: 18,
    description: 'ID de la carpeta marketplace'
  })
  @IsNumber()
  marketplace_id: number;
}
