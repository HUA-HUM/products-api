import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class CreatePublicationRunDTO {
  @ApiProperty({
    example: ['meli', 'fravega'],
    description: 'Lista de marketplaces donde se publicarán los productos'
  })
  @IsArray()
  @IsString({ each: true })
  marketplaces: string[];
}
