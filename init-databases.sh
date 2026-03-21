#!/bin/bash

# ============================================
# Script para criar schema nas bases de dados existentes
# ============================================

echo "🍺 Inicializando schema nas bases de dados existentes..."
echo ""

# ============================================
# CASSANDRA - Criar keyspace e tabelas
# ============================================
echo "📦 Cassandra - Criando keyspace e tabelas..."

docker exec -i $(docker ps --format '{{.Names}}' | grep -i cassandra | head -1) cqlsh <<'EOF'
-- Keyspace
CREATE KEYSPACE IF NOT EXISTS beersocial
WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
};

USE beersocial;

-- Timeline
CREATE TABLE IF NOT EXISTS user_timeline (
    user_id UUID,
    created_at TIMESTAMP,
    review_id UUID,
    author_id UUID,
    author_name TEXT,
    beer_id UUID,
    beer_name TEXT,
    beer_style TEXT,
    rating DECIMAL,
    content TEXT,
    likes_count COUNTER,
    comments_count COUNTER,
    PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC)
  AND default_time_to_live = 604800;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    conversation_id TEXT,
    created_at TIMESTAMP,
    message_id UUID,
    sender_id UUID,
    receiver_id UUID,
    sender_name TEXT,
    content TEXT,
    is_read BOOLEAN,
    PRIMARY KEY (conversation_id, created_at)
) WITH CLUSTERING ORDER BY (created_at ASC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    user_id UUID,
    created_at TIMESTAMP,
    notification_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    data TEXT,
    is_read BOOLEAN,
    PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC)
  AND default_time_to_live = 2592000;

-- User Activity
CREATE TABLE IF NOT EXISTS user_activity (
    user_id UUID,
    created_at TIMESTAMP,
    activity_id UUID,
    activity_type TEXT,
    beer_id UUID,
    beer_name TEXT,
    rating DECIMAL,
    content TEXT,
    PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Beer Reviews Index
CREATE TABLE IF NOT EXISTS beer_reviews_index (
    beer_id UUID,
    created_at TIMESTAMP,
    review_id UUID,
    user_id UUID,
    user_name TEXT,
    rating DECIMAL,
    content TEXT,
    PRIMARY KEY (beer_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Followers
CREATE TABLE IF NOT EXISTS followers (
    user_id UUID,
    follower_id UUID,
    follower_name TEXT,
    followed_at TIMESTAMP,
    PRIMARY KEY (user_id, follower_id)
);

CREATE TABLE IF NOT EXISTS following (
    user_id UUID,
    following_id UUID,
    following_name TEXT,
    followed_at TIMESTAMP,
    PRIMARY KEY (user_id, following_id)
);

-- Rate Limiting
CREATE TABLE IF NOT EXISTS rate_limiting (
    user_action TEXT,
    bucket_start TIMESTAMP,
    request_count COUNTER,
    PRIMARY KEY (user_action, bucket_start)
);

DESCRIBE TABLES;
EOF

echo ""
echo "✅ Cassandra schema criado!"
echo ""

# ============================================
# MONGODB - Criar collections e indexes
# ============================================
echo "📦 MongoDB - Criando collections e indexes..."

MONGO_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i mongo | head -1)

if [ -n "$MONGO_CONTAINER" ]; then
    docker exec -i $MONGO_CONTAINER mongosh <<'EOF'
use beersocial;

// Collections
db.createCollection('users');
db.createCollection('beers');
db.createCollection('reviews');
db.createCollection('friendships');
db.createCollection('notifications');

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

// Beers indexes
db.beers.createIndex({ name: 1 });
db.beers.createIndex({ brewery: 1 });
db.beers.createIndex({ style: 1 });

// Reviews indexes
db.reviews.createIndex({ beerId: 1, createdAt: -1 });
db.reviews.createIndex({ userId: 1, createdAt: -1 });
db.reviews.createIndex({ userId: 1, beerId: 1 }, { unique: true });

// Friendships indexes
db.friendships.createIndex({ requesterId: 1, addresseeId: 1 }, { unique: true });
db.friendships.createIndex({ addresseeId: 1, status: 1 });

// Notifications indexes
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, isRead: 1 });

show collections;
EOF
    echo ""
    echo "✅ MongoDB schema criado!"
else
    echo "⚠️  Container MongoDB não encontrado"
fi

echo ""
echo "✅ Schema inicializado! Podes agora correr: bun run dev"
