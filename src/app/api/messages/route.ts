/**
 * MESSAGES ENDPOINT
 * 
 * ============================================================
 * TECNOLOGIA: Cassandra
 * PROPÓSITO: Mensagens privadas (partition key)
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCassandra } from '@/lib/cassandra-client';
import { getMongoDB } from '@/lib/mongodb-client';
import { getRedis } from '@/lib/redis-client';

// GET - Obter conversas ou mensagens
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const otherUserId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const cassandra = await getCassandra();

    if (otherUserId) {
      // Obter conversa com utilizador específico
      const messages = await cassandra.getConversation(user.id, otherUserId, limit);

      return NextResponse.json({
        technology: {
          storage: 'Cassandra (messages table)',
          partitionKey: {
            field: 'conversation_id',
            calculation: 'hash(user1_id + user2_id) - ordenados alfabeticamente',
            purpose: 'Todas as mensagens de uma conversa na mesma partição',
          },
          clusteringKey: {
            field: 'created_at',
            order: 'ASC',
            purpose: 'Ordem cronológica automática',
          },
          query: `SELECT * FROM messages WHERE conversation_id = '${cassandra.generateConversationId(user.id, otherUserId)}' LIMIT ${limit}`,
        },
        conversationId: cassandra.generateConversationId(user.id, otherUserId),
        messages,
      });
    } else {
      // Obter lista de conversas (usar MongoDB para metadata)
      const mongo = await getMongoDB();
      const conversations = await mongo.getUserConversations(user.id);

      return NextResponse.json({
        technology: {
          storage: 'MongoDB (para metadata de conversas)',
          messages: 'Cassandra (para mensagens)',
        },
        conversations,
      });
    }
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Erro ao obter mensagens' },
      { status: 500 }
    );
  }
}

// POST - Enviar mensagem
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Destinatário e conteúdo são obrigatórios' },
        { status: 400 }
      );
    }

    const cassandra = await getCassandra();
    
    // Enviar mensagem (Cassandra)
    const message = await cassandra.sendMessage(user.id, receiverId, user.name, content);

    // Criar notificação (MongoDB)
    const mongo = await getMongoDB();
    await mongo.createNotification({
      userId: receiverId,
      type: 'NEW_MESSAGE',
      title: 'Nova Mensagem',
      message: `${user.name} enviou-lhe uma mensagem`,
      data: JSON.stringify({ senderId: user.id }),
    });

    // Notificar via Redis Pub/Sub (tempo real)
    const redis = await getRedis();
    await redis.notifyNewMessage(receiverId, user.id, content);

    return NextResponse.json({
      technology: {
        storage: 'Cassandra (messages table)',
        partitionKey: 'conversation_id = hash(user1 + user2)',
        clusteringKey: 'created_at ASC',
        notification: 'MongoDB (notifications collection)',
        realtime: 'Redis Pub/Sub',
      },
      message,
      conversationId: cassandra.generateConversationId(user.id, receiverId),
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}
