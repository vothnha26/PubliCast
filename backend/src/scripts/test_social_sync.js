const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables từ file .env của backend
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const prisma = new PrismaClient();

// Import socialWorker từ queues
const { socialWorker } = require('../queues/social.worker');

async function runSocialSyncTest() {
  console.log("=========================================================");
  console.log("🚀 STARTING AUTOMATED SOCIAL SYNC INTEGRATION TEST 🚀");
  console.log("=========================================================");

  let redisClient;
  let syncQueue;

  const mockAccountId = uuidv4();
  let testBrandId = null;

  try {
    // 1. Kết nối và lấy Brand đầu tiên
    console.log("🔌 Connecting and querying Brand from database using Prisma...");
    const brand = await prisma.brand.findFirst();
    if (!brand) {
      throw new Error("No Brand found in database! Please run seed or create a workspace first.");
    }
    testBrandId = brand.id;
    console.log(`✅ Using Test Brand ID: ${testBrandId}`);

    // 2. Tạo SocialAccount giả lập với trạng thái PENDING
    console.log("📝 Creating mock SocialAccount with syncStatus = PENDING...");
    await prisma.socialAccount.create({
      data: {
        id: mockAccountId,
        brandId: testBrandId,
        platform: 'YOUTUBE',
        platformAccountId: 'mock_yt_123',
        username: 'mock_user',
        displayName: 'Mock YouTube Channel',
        accessToken: 'mock_access_token',
        scopes: 'youtube.readonly',
        isConnected: true,
        connectedAt: new Date(),
        syncStatus: 'PENDING'
      }
    });
    console.log(`✅ Mock SocialAccount created with ID: ${mockAccountId}`);

    // 3. Đảm bảo worker đang hoạt động
    console.log("⚙️ Starting social worker for processing...");
    if (socialWorker && typeof socialWorker.resume === 'function') {
      await socialWorker.resume();
    }

    // 4. Khởi tạo BullMQ Queue và đẩy job đồng bộ
    console.log("🔌 Connecting to Redis & BullMQ Queue...");
    redisClient = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
    syncQueue = new Queue('social-sync-queue', { connection: redisClient });
    console.log("✅ Queue connected.");

    const { QUEUE_CONFIG } = require('../constants/video-publish.constants');

    console.log(`📤 Dispatching sync job for account: ${mockAccountId}...`);
    const job = await syncQueue.add(QUEUE_CONFIG.SOCIAL.JOB_SYNC, {
      socialAccountId: mockAccountId,
      platform: 'YOUTUBE',
    }, {
      attempts: 1, // Trong môi trường test chỉ chạy 1 lần để nhanh chóng nhận kết quả
    });
    console.log(`✅ Job added to queue. Job ID: ${job.id}`);

    // 5. Thăm dò (Polling) DB để kiểm tra trạng thái cập nhật của Worker
    console.log("⏳ Waiting for Worker to process the job...");
    let processed = false;
    let finalStatus = 'PENDING';

    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const account = await prisma.socialAccount.findUnique({
        where: { id: mockAccountId }
      });
      if (account) {
        finalStatus = account.syncStatus;
        console.log(`   [Attempt ${i + 1}/15] Current syncStatus in DB: ${finalStatus}`);
        if (finalStatus !== 'PENDING') {
          processed = true;
          break;
        }
      }
    }

    if (!processed) {
      throw new Error("Timeout waiting for worker to process the job!");
    }

    // Vì accessToken là 'mock_access_token' nên Worker chắc chắn sẽ FAIL khi call API thật.
    // Kết quả đúng mong đợi là syncStatus chuyển sang 'FAILED'.
    console.log(`📊 Processing complete. Final status is: ${finalStatus}`);
    if (finalStatus === 'FAILED') {
      console.log("🏆 SUCCESS: Worker processed the job and set status to FAILED as expected due to mock token!");
    } else if (finalStatus === 'SUCCESS') {
      console.log("🏆 SUCCESS: Worker processed the job and completed successfully!");
    } else {
      throw new Error(`Unexpected final status: ${finalStatus}`);
    }

    console.log("\n=========================================================");
    console.log("🏆 ALL SOCIAL SYNC INTEGRATION TEST CASES PASSED! 🏆");
    console.log("=========================================================");

  } catch (err) {
    console.error("❌ INTEGRATION TEST FAILED!");
    console.error("Error Detail:", err.message);
    process.exitCode = 1;
  } finally {
    // 6. Dọn dẹp dữ liệu test
    console.log("🧹 Cleaning up mock SocialAccount records...");
    try {
      await prisma.socialAccount.delete({
        where: { id: mockAccountId }
      });
      console.log("✅ Cleanup complete.");
    } catch (e) {
      console.error("⚠️ Cleanup failed:", e.message);
    }
    
    await prisma.$disconnect();

    if (syncQueue) {
      await syncQueue.close();
    }
    if (redisClient) {
      redisClient.disconnect();
    }
    // Shutdown socialWorker để Node process thoát một cách Graceful
    if (socialWorker) {
      console.log("🛑 Closing social worker...");
      await socialWorker.close();
    }
    console.log("🏁 Test execution finished.");
  }
}

runSocialSyncTest();
