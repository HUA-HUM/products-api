import { NestFactory } from '@nestjs/core';
import { AddressInfo } from 'node:net';
import { AppModule } from './app/app.module';
import { setupSwagger } from './common/swagger/swagger.setup';
import 'dotenv/config';
import { setupBullBoard } from './app/bull-board.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  setupSwagger(app, 'Products API', 'API principal de productos, marcas, categorías y órdenes', []);

  setupBullBoard(app);

  const port = await listenOnAvailablePort(app, Number(process.env.PORT ?? 3000));
  console.log(`API running on port ${port}`);
}
bootstrap();

async function listenOnAvailablePort(app: Awaited<ReturnType<typeof NestFactory.create>>, startPort: number): Promise<number> {
  let port = startPort;

  while (true) {
    try {
      await app.listen(port, '0.0.0.0');
      return resolveBoundPort(app, port);
    } catch (error) {
      if (!isAddressInUse(error)) {
        throw error;
      }

      console.warn(`Port ${port} is busy, trying ${port + 1}...`);
      port++;
    }
  }
}

function isAddressInUse(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EADDRINUSE';
}

function resolveBoundPort(app: Awaited<ReturnType<typeof NestFactory.create>>, fallbackPort: number): number {
  const server = app.getHttpServer();
  const address = server.address() as AddressInfo | null;

  return address?.port ?? fallbackPort;
}
