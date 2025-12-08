import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;
let isConnected = false;

export async function connectRedis(): Promise<boolean> {
  if (!process.env.REDIS_URL) {
    console.warn("⚠️  REDIS_URL not configured, Redis connection skipped");
    return false;
  }

  if (isConnected && client?.isOpen) {
    return true;
  }

  try {
    if (!client) {
      let redisUrl = process.env.REDIS_URL.trim();
      
      if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
        if (redisUrl.includes('@')) {
          redisUrl = `rediss://${redisUrl}`;
        } else {
          redisUrl = `redis://${redisUrl}`;
        }
        console.log("🔧 Fixed REDIS_URL (added protocol):", redisUrl.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
      }
      
      console.log("🔄 Connecting to Redis...");
      
      client = createClient({
        url: redisUrl,
      }) as RedisClientType;

      client.on("error", (err) => {
        console.error("❌ Redis Client Error:", err);
        isConnected = false;
      });

      client.on("connect", () => {
        console.log("🔄 Redis connecting...");
      });

      client.on("ready", () => {
        console.log("✅ Redis ready!");
        isConnected = true;
      });

      client.on("end", () => {
        console.log("🔌 Redis disconnected");
        isConnected = false;
      });
    }

    if (!client.isOpen) {
      await client.connect();
      isConnected = true;
      console.log("✅ Redis connected successfully!");
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error);
    isConnected = false;
    return false;
  }
}

export function getRedisClient(): RedisClientType | null {
  if (client && client.isOpen && isConnected) {
    return client;
  }
  return null;
}

export async function disconnectRedis(): Promise<void> {
  if (client && client.isOpen) {
    try {
      await client.quit();
      isConnected = false;
      console.log("🔌 Redis disconnected gracefully");
    } catch (error) {
      console.error("❌ Error disconnecting Redis:", error);
    }
  }
}

export default client;

