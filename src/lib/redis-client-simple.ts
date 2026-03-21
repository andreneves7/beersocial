/**
 * Simple Redis Client for Status Check
 */

import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let connected = false;

export async function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = createClient({ url });
    
    client.on('error', () => { connected = false; });
    client.on('end', () => { connected = false; });
    client.on('connect', () => { connected = true; });
    client.on('ready', () => { connected = true; });
    
    try {
      await client.connect();
      connected = true;
    } catch (error) {
      connected = false;
    }
  }
  
  return {
    isConnected: () => connected,
    getClient: () => client,
  };
}
