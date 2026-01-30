import { Module } from '@nestjs/common';
import { ImportMarketplaceWorker } from 'src/app/services/marketplace/imports/workers/import-marketplace.worker';
import { ImportMarketplaceService } from 'src/app/services/queues/import-marketplace.service';
import { ImportProductsModule } from '../import-products/ImportProducts.Module';
import { MarketplaceImportController } from 'src/app/controller/marketplaces/import-product/MarketplaceImport.Controller';

@Module({
  imports: [ImportProductsModule],
  controllers: [MarketplaceImportController],
  providers: [ImportMarketplaceService, ImportMarketplaceWorker]
})
export class ImportMarketplaceModule {}
