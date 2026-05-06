import { NestFactory } from '@nestjs/core';
import { RunMarketplaceChangesWorkerModule } from './app/module/marketplace-changes/worker/RunMarketplaceChangesWorker.Module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(RunMarketplaceChangesWorkerModule);

  console.log('Marketplace changes worker running');

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });

  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void bootstrap();
