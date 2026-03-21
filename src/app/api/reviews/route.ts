/**
 * REVIEWS ENDPOINT
 * 
 * ============================================================
 * TECNOLOGIA: MongoDB
 * PROPÓSITO: Reviews com comentários embedded
 * ============================================================
 * 
 * PORQUÊ MONGODB PARA REVIEWS?
 * - Comentários são guardados DENTRO do documento de review
 * - Likes são um array de userIds
 * - Uma única query obtém review + comments + likes
 * - Sem JOINs necessários
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMongoDB } from '@/lib/mongodb-client';
import { getCurrentUser } from '@/lib/auth';
import { getRedis } from '@/lib/redis-client';
import { getCassandra } from '@/lib/cassandra-client';

// GET - Listar reviews (feed)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const beerId = searchParams.get('beerId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const mongo = await getMongoDB();
    
    let reviews;
    
    if (beerId) {
      reviews = await mongo.getReviewsByBeer(beerId, limit, offset);
    } else if (userId) {
      reviews = await mongo.getReviewsByUser(userId, limit, offset);
    } else {
      reviews = await mongo.getAllReviews(limit, offset);
    }

    return NextResponse.json({
      technology: {
        storage: 'MongoDB (reviews collection)',
        embeddedDocuments: ['comments[]', 'likes[]'],
        indexes: ['beerId_1_createdAt_-1', 'userId_1_createdAt_-1'],
      },
      reviews,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Erro ao obter reviews' },
      { status: 500 }
    );
  }
}

// POST - Criar review
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { beerId, beerName, rating, content } = body;

    if (!beerId || !rating) {
      return NextResponse.json(
        { error: 'Cerveja e avaliação são obrigatórios' },
        { status: 400 }
      );
    }

    const mongo = await getMongoDB();
    
    // Verificar se já avaliou
    const alreadyReviewed = await mongo.checkUserReviewed(user.id, beerId);
    if (alreadyReviewed) {
      return NextResponse.json(
        { error: 'Já avaliou esta cerveja' },
        { status: 400 }
      );
    }

    // Criar review no MongoDB
    const review = await mongo.createReview({
      userId: user.id,
      userName: user.name,
      beerId,
      beerName,
      rating: parseFloat(rating),
      content,
    });

    // Invalidar cache relacionado
    const redis = await getRedis();
    await Promise.all([
      redis.invalidatePattern(`beer:${beerId}`),
      redis.invalidatePattern(`reviews:*`),
    ]);

    // Adicionar ao timeline dos followers (Cassandra)
    try {
      const cassandra = await getCassandra();
      const friendships = await mongo.getFriends(user.id);
      const followerIds = friendships
        .filter(f => f.status === 'ACCEPTED')
        .map(f => f.requesterId === user.id ? f.addresseeId : f.requesterId);
      
      if (followerIds.length > 0) {
        await cassandra.addToTimeline(followerIds, {
          author_id: user.id,
          author_name: user.name,
          beer_id: beerId,
          beer_name: beerName,
          beer_style: '',
          rating: parseFloat(rating),
          content: content || '',
        });
      }
    } catch (e) {
      console.warn('Could not add to Cassandra timeline:', e);
    }

    return NextResponse.json({
      technology: {
        storage: 'MongoDB (embedded comments & likes)',
        cacheInvalidation: 'Redis (beer:*, reviews:*)',
        timeline: 'Cassandra (partition by user_id)',
      },
      review,
    }, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar review' },
      { status: 500 }
    );
  }
}
