export type PublicationJob = {
  sku: string;
  marketplace: string;
};

export class CreatePublicationJobProcess {
  execute(skus: string[], marketplaces: string[]): PublicationJob[] {
    const jobs: PublicationJob[] = [];

    for (const sku of skus) {
      for (const marketplace of marketplaces) {
        jobs.push({
          sku,
          marketplace
        });
      }
    }

    return jobs;
  }
}
