import { ConnectionOptions } from 'bullmq';

export const bullmqConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined
};
console.log('REDIS_PORT', process.env.REDIS_PORT);
