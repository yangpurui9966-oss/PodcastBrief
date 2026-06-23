import { ConnectionOptions, Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const connection: ConnectionOptions = redis;

export const podcastQueue = new Queue('podcast-processing', { connection });

export function createPodcastWorker(processor: (job: Job) => Promise<any>) {
  return new Worker('podcast-processing', processor, { connection });
}
