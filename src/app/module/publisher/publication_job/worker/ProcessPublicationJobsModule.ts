import { Module } from '@nestjs/common';

/* ======================================
   CONTROLLER & SERVICE
====================================== */
import { ProcessPublicationJobsController } from 'src/app/controller/publisher/publication_job/worker/ProcessPublicationJobs.Controller';
import { ProcessPublicationJobsService } from 'src/app/services/publisher/publication_job/worker/ProcessPublicationJobsService';
import { ProcessPublicationJobsCronService } from 'src/app/services/publisher/publication_job/worker/ProcessPublicationJobsCronService';

/* ======================================
   HTTP CLIENTS
====================================== */
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { MarketplaceHttpClient } from 'src/core/drivers/repositories/marketplace-api/http/MarketplaceHttpClient';

/* ======================================
   CORE INTERACTOR
====================================== */
import { ProcessPublicationJobs } from 'src/core/interactors/publisher/publication_job/worker/ProcessPublicationJobs';

/* ======================================
   JOB REPOSITORIES
====================================== */
import { ClaimJobsRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_job/ClaimJobs/ClaimJobsRepository';
import { UpdateJobRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_job/updateStatus/UpdateJobRepository';

/* ======================================
   MADRE REPOSITORIES
====================================== */
import { GetMadreProductsRepository } from 'src/core/drivers/repositories/madre-api/products/get/GetMadreProductsRepository';

/* ======================================
   MEGATONE
====================================== */
import { PublishMegatoneProduct } from 'src/core/interactors/publisher/megatone/PublishMegatoneProduct';
import { ResolveMegatoneCategory } from 'src/core/interactors/publisher/megatone/category/ResolveMegatoneCategory';
import { ResolveMegatoneBrand } from 'src/core/interactors/publisher/megatone/brand/ResolveMegatoneBrand';
import { ResolveMegatonePrices } from 'src/core/interactors/publisher/megatone/price/ResolveMegatonePrices';
import { BuildMegatonePayload } from 'src/core/interactors/publisher/megatone/payload/BuildMegatonePayload';

/* ======================================
   FRAVEGA
====================================== */
import { PublishFravegaProduct } from 'src/core/interactors/publisher/fravega/PublishFravegaProduct';
import { ResolveFravegaCategory } from 'src/core/interactors/publisher/fravega/category/ResolveFravegaCategory';
import { ResolveFravegaBrand } from 'src/core/interactors/publisher/fravega/brand/ResolveFravegaBrand';
import { ResolveFravegaAttributes } from 'src/core/interactors/publisher/fravega/atributtes/ResolveFravegaAttributes';
import { ResolveFravegaPrices } from 'src/core/interactors/publisher/fravega/price/ResolveFravegaPrices';
import { BuildFravegaPayload } from 'src/core/interactors/publisher/fravega/payload/BuildFravegaPayload';
import { CreateFravegaProductsRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/CreateProducts/CreateFravegaProductsRepository';
import { CheckProductExistsRepository } from 'src/core/drivers/repositories/madre-api/Sync_items/CheckProductExists/CheckProductExistsRepository';
import { CreateMegatoneProductsRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/createProducts/CreateMegatoneProductsRepository';
import { OpenAIAttributesExtractor } from 'src/app/driver/repository/opanAi/OpenAIAttributesExtractor';
import { MatchCategoryRepository } from 'src/app/driver/repository/opanAi/MatchCategoryRepository';
import { MatchOnCityBrandRepository } from 'src/app/driver/repository/opanAi/MatchOnCityBrandRepository';
import { MatchOnCityCategoryRepository } from 'src/app/driver/repository/opanAi/MatchOnCityCategoryRepository';
import { GetCategoryIdRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/getCategoryId/MegatoneCategoryResponse';
import { GetBrandIdRepository } from 'src/core/drivers/repositories/marketplace-api/megatone/getBrandId/GetBrandIdRepository';
import { GetFravegaBrandIdRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/GetBrandId/GetFravegaBrandIdRepository';
import { GetFravegaCategoriesTreeRepository } from 'src/core/drivers/repositories/marketplace-api/fravega/GetCategoriesTree/GetFravegaCategoriesTreeRepository';
import { PublishOncityProduct } from 'src/core/interactors/publisher/oncity/PublishOncityProduct';
import { ResolveOnCityBrand } from 'src/core/interactors/publisher/oncity/brand/ResolveOnCityBrand';
import { ResolveOnCityCategory } from 'src/core/interactors/publisher/oncity/category/ResolveOnCityCategory';
import { BuildOnCityPayload } from 'src/core/interactors/publisher/oncity/payload/BuildOnCityPayload';
import { ResolveOnCityPrices } from 'src/core/interactors/publisher/oncity/price/ResolveOnCityPrices';
import { CreateOnCityProductsRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/createProducts/CreateOnCityProductsRepository';
import { GetOnCityBrandsRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/GetBrand/GetOnCityBrandsRepository';
import { GetOnCityCategoriesTreeRepository } from 'src/core/drivers/repositories/marketplace-api/oncity/GetCategoriesTree/GetOnCityCategoriesTreeRepository';

/* ======================================
   OPENAI
====================================== */

@Module({
  controllers: [ProcessPublicationJobsController],
  providers: [
    /* ======================================
       CORE
    ====================================== */
    ProcessPublicationJobsService,
    ProcessPublicationJobsCronService,
    ProcessPublicationJobs,

    /* ======================================
       HTTP CLIENTS
    ====================================== */
    MadreHttpClient,
    MarketplaceHttpClient,

    /* ======================================
       JOB REPOS
    ====================================== */
    {
      provide: 'IClaimJobsRepository',
      useFactory: (http: MadreHttpClient) => new ClaimJobsRepository(http),
      inject: [MadreHttpClient]
    },
    {
      provide: 'IUpdateJobRepository',
      useFactory: (http: MadreHttpClient) => new UpdateJobRepository(http),
      inject: [MadreHttpClient]
    },

    /* ======================================
       MADRE REPOS
    ====================================== */
    {
      provide: 'ICheckProductExistsRepository',
      useFactory: (http: MadreHttpClient) => new CheckProductExistsRepository(http),
      inject: [MadreHttpClient]
    },
    {
      provide: 'IGetMadreProductsRepository',
      useFactory: (http: MadreHttpClient) => new GetMadreProductsRepository(http),
      inject: [MadreHttpClient]
    },

    /* ======================================
       MEGATONE REPO
    ====================================== */
    {
      provide: 'ICreateMegatoneProductsRepository',
      useFactory: (http: MarketplaceHttpClient) => new CreateMegatoneProductsRepository(http),
      inject: [MarketplaceHttpClient]
    },

    /* ======================================
       FRAVEGA REPO
    ====================================== */
    {
      provide: 'ICreateFravegaProductsRepository',
      useFactory: (http: MarketplaceHttpClient) => new CreateFravegaProductsRepository(http),
      inject: [MarketplaceHttpClient]
    },
    {
      provide: 'ICreateOnCityProductsRepository',
      useClass: CreateOnCityProductsRepository
    },
    {
      provide: 'IGetOnCityBrandsRepository',
      useFactory: (http: MarketplaceHttpClient) => new GetOnCityBrandsRepository(http),
      inject: [MarketplaceHttpClient]
    },
    {
      provide: 'IGetOnCityCategoriesTreeRepository',
      useFactory: (http: MarketplaceHttpClient) => new GetOnCityCategoriesTreeRepository(http),
      inject: [MarketplaceHttpClient]
    },

    /* ======================================
       OPENAI
    ====================================== */
    {
      provide: 'IOpenAIAttributesExtractor',
      useClass: OpenAIAttributesExtractor
    },
    {
      provide: 'IMatchFravegaCategoryRepository',
      useClass: MatchCategoryRepository
    },
    {
      provide: 'IMatchOnCityCategoryRepository',
      useClass: MatchOnCityCategoryRepository
    },
    {
      provide: 'IMatchOnCityBrandRepository',
      useClass: MatchOnCityBrandRepository
    },

    /* ======================================
   MEGATONE CATEGORY
====================================== */
    {
      provide: 'IGetCategoryIdRepository',
      useFactory: (http: MadreHttpClient) => new GetCategoryIdRepository(http),
      inject: [MadreHttpClient]
    },

    /* ======================================
   MEGATONE BRAND
====================================== */
    {
      provide: 'IGetBrandIdRepository',
      useFactory: (http: MadreHttpClient) => new GetBrandIdRepository(http),
      inject: [MadreHttpClient]
    },

    /* ======================================
   FRAVEGA CATEGORY
====================================== */
    {
      provide: 'IGetFravegaCategoriesTreeRepository',
      useFactory: (http: MarketplaceHttpClient) => new GetFravegaCategoriesTreeRepository(http),
      inject: [MarketplaceHttpClient]
    },

    /* ======================================
   FRAVEGA BRAND
====================================== */
    {
      provide: 'IGetFravegaBrandIdRepository',
      useFactory: (http: MadreHttpClient) => new GetFravegaBrandIdRepository(http),
      inject: [MadreHttpClient]
    },

    /* ======================================
       MEGATONE INTERACTORS
    ====================================== */
    ResolveMegatoneCategory,
    ResolveMegatoneBrand,
    ResolveMegatonePrices,
    BuildMegatonePayload,
    PublishMegatoneProduct,

    /* ======================================
       FRAVEGA INTERACTORS
    ====================================== */
    ResolveFravegaCategory,
    ResolveFravegaBrand,
    ResolveFravegaAttributes,
    ResolveFravegaPrices,
    BuildFravegaPayload,
    PublishFravegaProduct,

    /* ======================================
       ONCITY INTERACTORS
    ====================================== */
    ResolveOnCityBrand,
    ResolveOnCityCategory,
    ResolveOnCityPrices,
    BuildOnCityPayload,
    PublishOncityProduct
  ]
})
export class ProcessPublicationJobsModule {}
