import { Module } from '@nestjs/common';

/* CONTROLLER & SERVICE */
import { ExecutePublicationsService } from 'src/app/services/publisher/execute/ExecutePublicationsService';
import { ExecutePublicationsCronService } from 'src/app/services/publisher/execute/ExecutePublicationsCronService';

/* INTERACTORS */
import { ExecutePublications } from 'src/core/interactors/publisher/execute/ExecutePublications';
import { CreatePublicationRun } from 'src/core/interactors/publisher/publication_run/CreatePublicationRun';
import { GetMarketplaceFavoriteSkus } from 'src/core/interactors/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkus';
import { CreatePublicationJobProcess } from 'src/core/interactors/publisher/publication_job/CreatePublicationJob/CreatePublicationJobProcess';
import { SendPublicationJobs } from 'src/core/interactors/publisher/publication_job/sendJobProcess/SendPublicationJobs';

/* REPOSITORIES */
import { MadreHttpClient } from 'src/core/drivers/repositories/madre-api/http/MadreHttpClient';
import { CreatePublicationRunRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_run/CreatePublicationRunRepository';
import { GetMarketplaceFavoriteSkusRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_job/getSkusFromFolders/GetMarketplaceFavoriteSkusRepository';
import { SendPublicationJobsRepository } from 'src/core/drivers/repositories/madre-api/publisher/publication_job/sendJobProcess/SendPublicationJobsRepository';
import { ExecutePublicationsController } from 'src/app/controller/publisher/execute/ExecutePublications.Controller';

@Module({
  controllers: [ExecutePublicationsController],
  providers: [
    ExecutePublicationsService,
    ExecutePublicationsCronService,
    ExecutePublications,

    /* HTTP */
    MadreHttpClient,

    /* INTERACTORS */
    CreatePublicationRun,
    GetMarketplaceFavoriteSkus,
    CreatePublicationJobProcess,
    SendPublicationJobs,

    /* REPOSITORIES */
    {
      provide: 'ICreatePublicationRunRepository',
      useFactory: (http: MadreHttpClient) => new CreatePublicationRunRepository(http),
      inject: [MadreHttpClient]
    },
    {
      provide: 'IGetMarketplaceFavoriteSkusRepository',
      useFactory: (http: MadreHttpClient) => new GetMarketplaceFavoriteSkusRepository(http),
      inject: [MadreHttpClient]
    },
    {
      provide: 'ISendPublicationJobsRepository',
      useFactory: (http: MadreHttpClient) => new SendPublicationJobsRepository(http),
      inject: [MadreHttpClient]
    }
  ]
})
export class ExecutePublicationsModule {}
