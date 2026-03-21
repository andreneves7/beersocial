/**
 * STATUS ENDPOINT
 * 
 * GET /api/status
 * 
 * Verifica a ligação a todas as bases de dados:
 * - Redis (Cache e Sessões) - Porta 6379
 * - MongoDB (Documentos) - Porta 27017
 * - Cassandra (Distribuído) - Porta 9042
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    
    redis: { 
      connected: false, 
      latency: 0, 
      error: null as string | null,
      purpose: 'Cache TTL, Sessões Hash, Contadores, Rate Limiting, Leaderboards ZSET'
    },
    
    mongodb: { 
      connected: false, 
      latency: 0, 
      error: null as string | null,
      purpose: 'Users, Beers, Reviews (embedded comments), Friendships'
    },
    
    cassandra: { 
      connected: false, 
      latency: 0, 
      error: null as string | null,
      purpose: 'Timeline (partition by user_id), Messages (partition by conversation_id)'
    },
  };

  // Redis - Cache e sessões
  try {
    const start = Date.now();
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    const { createClient } = await import('redis');
    const client = createClient({ url: redisUrl });
    
    client.on('error', () => {});
    await client.connect();
    await client.ping();
    await client.disconnect();
    
    results.redis.connected = true;
    results.redis.latency = Date.now() - start;
  } catch (error) {
    results.redis.error = error instanceof Error ? error.message : 'Connection failed';
  }

  // MongoDB - Dados documentais
  try {
    const start = Date.now();
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
    const mongoDb = process.env.MONGODB_DB || 'beersocial';
    
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(mongoUrl);
    
    await client.connect();
    await client.db(mongoDb).command({ ping: 1 });
    await client.close();
    
    results.mongodb.connected = true;
    results.mongodb.latency = Date.now() - start;
  } catch (error) {
    results.mongodb.error = error instanceof Error ? error.message : 'Connection failed';
  }

  // Cassandra - Dados distribuídos
  try {
    const start = Date.now();
    const contactPoints = process.env.CASSANDRA_CONTACT_POINTS || 'localhost';
    const dc = process.env.CASSANDRA_DC || 'datacenter1';
    
    const { Client } = await import('cassandra-driver');
    const client = new Client({
      contactPoints: contactPoints.split(','),
      localDataCenter: dc,
    });
    
    await client.connect();
    await client.shutdown();
    
    results.cassandra.connected = true;
    results.cassandra.latency = Date.now() - start;
  } catch (error) {
    results.cassandra.error = error instanceof Error ? error.message : 'Connection failed';
  }

  const allConnected = results.redis.connected && results.mongodb.connected && results.cassandra.connected;

  return NextResponse.json({
    success: allConnected,
    ...results,
  }, { status: 200 });
}
