import { Job } from 'bullmq';
import { db } from '../lib/db';
import { analyzeTranscript } from '../lib/ai';
import { createPodcastWorker } from '../lib/queue';
import logger from '../lib/logger';

async function processPodcast(job: Job<{ podcastId: string }>) {
  const { podcastId } = job.data;
  logger.info({ podcastId, jobId: job.id }, '开始处理播客');

  try {
    // 1. 获取播客信息
    const podcast = await db.podcast.findUnique({
      where: { id: podcastId },
    });

    if (!podcast) {
      throw new Error(`Podcast not found: ${podcastId}`);
    }

    // 2. 更新状态为获取元数据中
    await db.podcast.update({
      where: { id: podcastId },
      data: { status: 'FETCHING' },
    });

    // TODO: 实现平台解析器（小宇宙、Apple Podcasts）
    // const metadata = await fetchMetadata(podcast.sourceUrl, podcast.platform);

    // 3. 更新状态为转写中
    await db.podcast.update({
      where: { id: podcastId },
      data: { status: 'TRANSCRIBING' },
    });

    // TODO: 实现语音转写（阿里云智能语音）
    // const transcript = await transcribeAudio(podcast.audioUrl);

    // 4. 更新状态为分析中
    await db.podcast.update({
      where: { id: podcastId },
      data: { status: 'ANALYZING' },
    });

    // 5. 获取转写文本
    const transcriptRecord = await db.transcript.findFirst({
      where: { podcastId },
    });

    if (!transcriptRecord) {
      throw new Error('Transcript not found');
    }

    // 6. AI 分析
    const analysis = await analyzeTranscript(transcriptRecord.rawText);

    // 7. 保存分析结果
    await db.analysis.createMany({
      data: [
        {
          podcastId,
          type: 'SUMMARY',
          content: { summary: analysis.summary, insights: analysis.insights },
        },
        {
          podcastId,
          type: 'TIMELINE',
          content: { topics: analysis.keyTopics },
        },
        {
          podcastId,
          type: 'RESOURCES',
          content: { resources: analysis.resources },
        },
        {
          podcastId,
          type: 'QUOTES',
          content: { quotes: analysis.quotes },
        },
      ],
    });

    // 8. 完成
    await db.podcast.update({
      where: { id: podcastId },
      data: { status: 'DONE' },
    });

    logger.info({ podcastId }, '播客处理完成');
  } catch (error) {
    logger.error({ podcastId, error }, '播客处理失败');
    await db.podcast.update({
      where: { id: podcastId },
      data: { status: 'ERROR', error: String(error) },
    });
    throw error;
  }
}

const worker = createPodcastWorker(processPodcast);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, '任务完成');
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, '任务失败');
});

logger.info('Podcast Worker 已启动');
