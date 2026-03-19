import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PublicationJobDto {
  @ApiProperty({
    example: 'B0CTPCZYR6',
    description: 'SKU del producto'
  })
  @IsString()
  sku: string;

  @ApiProperty({
    example: 'fravega',
    description: 'Marketplace destino'
  })
  @IsString()
  marketplace: string;
}

export class SendPublicationJobsDto {
  @ApiProperty({
    example: 4,
    description: 'ID del publication run'
  })
  @IsInt()
  run_id: number;

  @ApiProperty({
    type: [PublicationJobDto],
    description: 'Lista de jobs a crear'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationJobDto)
  jobs: PublicationJobDto[];
}
