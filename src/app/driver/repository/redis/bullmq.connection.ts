import { ConnectionOptions } from 'bullmq';
import 'dotenv/config';

const redisPort = parseInt(process.env.REDIS_PORT ?? '', 10);

if (!redisPort) {
  throw new Error('REDIS_PORT is missing or invalid');
}

export const bullmqConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST!,
  port: redisPort,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined
};
