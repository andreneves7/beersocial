'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Server, 
  Zap, 
  FileJson, 
  Table, 
  Terminal, 
  CheckCircle, 
  XCircle,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

// ============================================
// TIPOS
// ============================================
interface DatabaseStatus {
  name: string;
  connected: boolean;
  latency?: number;
  error?: string;
}

interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error' | 'command';
  title: string;
  message: string;
  code?: string;
  timestamp: Date;
}

// ============================================
// CONFIGURAÇÃO DAS BASES DE DADOS
// ============================================
const databaseConfigs = {
  redis: {
    name: 'Redis',
    icon: Zap,
    color: 'bg-red-500',
    description: 'Cache e estruturas de baixa latência',
    port: 6379,
    useCases: [
      { name: 'Cache TTL', description: 'Armazenar queries com expiração automática' },
      { name: 'Sessões', description: 'Sessões de utilizador em Hash' },
      { name: 'Contadores', description: 'Likes, views com INCR atómico' },
      { name: 'Rate Limiting', description: 'Limitar requests por utilizador' },
      { name: 'Leaderboards', description: 'Sorted sets para rankings' },
      { name: 'Pub/Sub', description: 'Notificações em tempo real' },
    ],
    commands: {
      cache: {
        title: 'Cache com TTL',
        code: `# Guardar em cache (TTL 300s)
SET cache:beer:123 '{"name":"Super Bock","rating":4.5}' EX 300

# Obter do cache
GET cache:beer:123

# Invalidar por padrão
KEYS cache:beer:*
DEL cache:beer:123`,
      },
      session: {
        title: 'Sessões (Hash)',
        code: `# Criar sessão
HSET session:abc123 userId "user_1" email "user@email.com" createdAt "1234567890"
EXPIRE session:abc123 86400

# Obter sessão
HGETALL session:abc123

# Eliminar sessão
DEL session:abc123`,
      },
      counter: {
        title: 'Contadores',
        code: `# Incrementar likes
INCR counter:beer:123:likes

# Obter contador
GET counter:beer:123:likes

# Ranking (Sorted Set)
ZADD lb:beers:rating 4.5 "beer_123"
ZREVRANGE lb:beers:rating 0 9 WITHSCORES`,
      },
      rateLimit: {
        title: 'Rate Limiting',
        code: `# Sliding window (Lua script)
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max = tonumber(ARGV[3])

ZREMRANGEBYSCORE key 0 (now - window * 1000)
local count = ZCARD key

if count < max then
  ZADD key now now
  EXPIRE key window
  return 1
else
  return 0
end`,
      },
    },
    scripts: {
      connection: `import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redis.connect();
await redis.set('key', 'value', { EX: 300 }); // TTL 5 min
const value = await redis.get('key');`,
    },
  },
  
  mongodb: {
    name: 'MongoDB',
    icon: FileJson,
    color: 'bg-green-500',
    description: 'Dados documentais com flexibilidade de schema',
    port: 27017,
    useCases: [
      { name: 'Users', description: 'Contas de utilizador com perfil' },
      { name: 'Beers', description: 'Catálogo de cervejas' },
      { name: 'Reviews', description: 'Reviews com comentários embedded' },
      { name: 'Friendships', description: 'Relações entre utilizadores' },
      { name: 'Notifications', description: 'Notificações do utilizador' },
    ],
    commands: {
      users: {
        title: 'Users (Collection)',
        code: `// Criar utilizador
db.users.insertOne({
  _id: "user_123",
  email: "user@email.com",
  name: "João Silva",
  username: "joaosilva",
  createdAt: new Date()
})

// Criar indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })

// Query
db.users.findOne({ email: "user@email.com" })`,
      },
      reviews: {
        title: 'Reviews (Embedded Comments)',
        code: `// Criar review com comentários embedded
db.reviews.insertOne({
  _id: "review_123",
  userId: "user_1",
  beerId: "beer_1",
  rating: 4.5,
  content: "Excelente cerveja!",
  comments: [], // Embedded array
  likes: [],    // Embedded array de userIds
  createdAt: new Date()
})

// Adicionar comentário (push para array)
db.reviews.updateOne(
  { _id: "review_123" },
  { $push: { comments: {
    userId: "user_2",
    content: "Concordo!",
    createdAt: new Date()
  }}}
)

// Adicionar like
db.reviews.updateOne(
  { _id: "review_123", likes: { $ne: "user_2" } },
  { $push: { likes: "user_2" } }
)

// Agregação para avg rating
db.reviews.aggregate([
  { $match: { beerId: "beer_1" } },
  { $group: { _id: null, avgRating: { $avg: "$rating" } } }
])`,
      },
      beers: {
        title: 'Beers (Collection)',
        code: `// Criar cerveja
db.beers.insertOne({
  _id: "beer_123",
  name: "Super Bock",
  brewery: "Unicer",
  style: "Lager",
  abv: 5.2,
  ibu: 20,
  country: "Portugal"
})

// Indexes
db.beers.createIndex({ name: 1 })
db.beers.createIndex({ brewery: 1 })
db.beers.createIndex({ style: 1 })

// Search
db.beers.find({
  $or: [
    { name: { $regex: "Super", $options: "i" } },
    { brewery: { $regex: "Super", $options: "i" } }
  ]
})`,
      },
    },
    scripts: {
      connection: `import { MongoClient } from 'mongodb';

const client = new MongoClient(
  process.env.MONGODB_URL || 'mongodb://localhost:27017'
);

await client.connect();
const db = client.db('beersocial');

// Criar documento
await db.collection('users').insertOne({
  email: 'user@email.com',
  name: 'João'
});

// Query com agregação
const stats = await db.collection('reviews').aggregate([
  { $match: { beerId: 'beer_1' } },
  { $group: { _id: null, avg: { $avg: '$rating' } } }
]).toArray();`,
    },
  },
  
  cassandra: {
    name: 'Cassandra',
    icon: Table,
    color: 'bg-blue-500',
    description: 'Dados distribuídos com partition key',
    port: 9042,
    useCases: [
      { name: 'Timeline', description: 'Feed do utilizador (partition by user_id)' },
      { name: 'Messages', description: 'Chat privado (partition by conversation)' },
      { name: 'Notifications', description: 'Notificações (partition by user_id)' },
      { name: 'User Activity', description: 'Log de atividade do utilizador' },
      { name: 'Followers', description: 'Relações de follow (denormalized)' },
    ],
    commands: {
      timeline: {
        title: 'Timeline (Query-First Design)',
        code: `-- Criar tabela para timeline
-- Partition Key: user_id (distribui por nodes)
-- Clustering Key: created_at DESC (ordena por tempo)
CREATE TABLE user_timeline (
  user_id UUID,
  created_at TIMESTAMP,
  review_id UUID,
  author_name TEXT,
  beer_name TEXT,
  rating DECIMAL,
  content TEXT,
  likes_count COUNTER,
  PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC)
  AND default_time_to_live = 604800; -- 7 dias

-- Inserir na timeline de múltiplos followers
INSERT INTO user_timeline 
  (user_id, created_at, review_id, author_name, beer_name, rating, content)
VALUES 
  (uuid(), toTimestamp(now()), uuid(), 'João', 'Super Bock', 4.5, 'Ótima!');

-- Query eficiente (só pela partition key!)
SELECT * FROM user_timeline 
WHERE user_id = ? 
LIMIT 20;`,
      },
      messages: {
        title: 'Messages (Conversation Partition)',
        code: `-- Partition Key: conversation_id
-- Clustering Key: created_at ASC (ordem cronológica)
CREATE TABLE messages (
  conversation_id TEXT,  -- user1_user2 (sorted)
  created_at TIMESTAMP,
  message_id UUID,
  sender_id UUID,
  receiver_id UUID,
  content TEXT,
  is_read BOOLEAN,
  PRIMARY KEY (conversation_id, created_at)
) WITH CLUSTERING ORDER BY (created_at ASC);

-- Inserir mensagem
INSERT INTO messages 
  (conversation_id, created_at, message_id, sender_id, receiver_id, content, is_read)
VALUES 
  ('user1_user2', toTimestamp(now()), uuid(), ?, ?, 'Olá!', false);

-- Query conversa (eficiente!)
SELECT * FROM messages 
WHERE conversation_id = 'user1_user2' 
LIMIT 50;`,
      },
      followers: {
        title: 'Followers (Denormalized Tables)',
        code: `-- Tabela de followers
CREATE TABLE followers (
  user_id UUID,
  follower_id UUID,
  follower_name TEXT,
  followed_at TIMESTAMP,
  PRIMARY KEY (user_id, follower_id)
);

-- Tabela de following (denormalized!)
CREATE TABLE following (
  user_id UUID,
  following_id UUID,
  following_name TEXT,
  followed_at TIMESTAMP,
  PRIMARY KEY (user_id, following_id)
);

-- Follow (batch insert em ambas)
BEGIN BATCH
  INSERT INTO followers (user_id, follower_id, follower_name, followed_at)
  VALUES (?, ?, 'João', toTimestamp(now()));
  INSERT INTO following (user_id, following_id, following_name, followed_at)
  VALUES (?, ?, 'Maria', toTimestamp(now()));
APPLY BATCH;

-- Query followers (eficiente!)
SELECT * FROM followers WHERE user_id = ?;`,
      },
    },
    scripts: {
      connection: `import { Client } from 'cassandra-driver';

const client = new Client({
  contactPoints: ['localhost'],
  localDataCenter: 'datacenter1',
  keyspace: 'beersocial'
});

await client.connect();

// Query com prepared statement
const result = await client.execute(
  'SELECT * FROM user_timeline WHERE user_id = ? LIMIT ?',
  [userId, 20],
  { prepare: true }
);

// Batch insert
await client.batch([
  { query: 'INSERT INTO followers ...', params: [...] },
  { query: 'INSERT INTO following ...', params: [...] }
], { prepare: true });`,
    },
  },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function DatabaseToastDemo() {
  const [statuses, setStatuses] = useState<Record<string, DatabaseStatus>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [expandedCommands, setExpandedCommands] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Verificar status das bases de dados
  const checkStatus = async () => {
    setIsLoading(true);
    addToast('info', 'Verificando conexões...', 'A testar ligação a todas as bases de dados');
    
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      
      setStatuses({
        redis: {
          name: 'Redis',
          connected: data.redis?.connected || false,
          latency: data.redis?.latency,
          error: data.redis?.error,
        },
        mongodb: {
          name: 'MongoDB',
          connected: data.mongodb?.connected || false,
          latency: data.mongodb?.latency,
          error: data.mongodb?.error,
        },
        cassandra: {
          name: 'Cassandra',
          connected: data.cassandra?.connected || false,
          latency: data.cassandra?.latency,
          error: data.cassandra?.error,
        },
      });

      // Toasts para cada status
      if (data.redis?.connected) {
        addToast('success', 'Redis conectado!', `Latência: ${data.redis.latency}ms`);
      } else {
        addToast('error', 'Redis falhou', data.redis?.error || 'Não foi possível conectar');
      }

      if (data.mongodb?.connected) {
        addToast('success', 'MongoDB conectado!', `Latência: ${data.mongodb.latency}ms`);
      } else {
        addToast('error', 'MongoDB falhou', data.mongodb?.error || 'Não foi possível conectar');
      }

      if (data.cassandra?.connected) {
        addToast('success', 'Cassandra conectado!', `Latência: ${data.cassandra.latency}ms`);
      } else {
        addToast('error', 'Cassandra falhou', data.cassandra?.error || 'Não foi possível conectar');
      }
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível verificar o status');
    }
    
    setIsLoading(false);
  };

  // Adicionar toast
  const addToast = (type: ToastMessage['type'], title: string, message: string, code?: string) => {
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      type,
      title,
      message,
      code,
      timestamp: new Date(),
    };
    setToasts(prev => [newToast, ...prev].slice(0, 10));
    
    // Também mostrar toast nativo
    if (type === 'success') {
      toast.success(title, { description: message });
    } else if (type === 'error') {
      toast.error(title, { description: message });
    } else if (type === 'command') {
      toast.info(title, { description: message });
    } else {
      toast.info(title, { description: message });
    }
  };

  // Simular operação de BD
  const simulateOperation = async (db: string, operation: string) => {
    const config = databaseConfigs[db as keyof typeof databaseConfigs];
    const cmd = config.commands[operation as keyof typeof config.commands];
    
    if (cmd) {
      addToast('command', `🔧 ${config.name}: ${cmd.title}`, 'Comando executado', cmd.code);
    }
  };

  // Copiar código
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copiado!', 'Código copiado para a área de transferência');
  };

  // Toggle comando expandido
  const toggleCommand = (key: string) => {
    setExpandedCommands(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🍺 BeerSocial - Database Dashboard
            </h1>
            <p className="text-slate-400">
              Visualização das operações e comandos em cada base de dados
            </p>
          </div>
          <Button
            onClick={checkStatus}
            disabled={isLoading}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Verificar Conexões
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(databaseConfigs).map(([key, config]) => {
          const Icon = config.icon;
          const status = statuses[key];
          
          return (
            <Card key={key} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {config.name}
                </CardTitle>
                {status && (
                  status.connected ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" /> Conectado
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500">
                      <XCircle className="h-3 w-3 mr-1" /> Desconectado
                    </Badge>
                  )
                )}
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm mb-2">{config.description}</p>
                <p className="text-slate-500 text-xs">Porta: {config.port}</p>
                {status?.latency && (
                  <p className="text-slate-500 text-xs">Latência: {status.latency}ms</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="redis" className="space-y-4">
          <TabsList className="bg-slate-800/50 border-slate-700">
            {Object.entries(databaseConfigs).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="data-[state=active]:bg-slate-700"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(databaseConfigs).map(([dbKey, config]) => (
            <TabsContent key={dbKey} value={dbKey} className="space-y-4">
              {/* Use Cases */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">📋 Casos de Uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {config.useCases.map((useCase, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                      >
                        <h4 className="text-white font-medium text-sm">{useCase.name}</h4>
                        <p className="text-slate-400 text-xs">{useCase.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Commands */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">💻 Comandos & Scripts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(config.commands).map(([cmdKey, cmd]) => {
                    const expandKey = `${dbKey}-${cmdKey}`;
                    const isExpanded = expandedCommands[expandKey];
                    
                    return (
                      <div key={cmdKey} className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/70"
                          onClick={() => toggleCommand(expandKey)}
                        >
                          <div className="flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-amber-400" />
                            <span className="text-white font-medium">{cmd.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                simulateOperation(dbKey, cmdKey);
                              }}
                              className="text-amber-400 hover:text-amber-300"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="border-t border-slate-600">
                            <pre className="p-4 text-sm text-green-400 bg-slate-900/50 overflow-x-auto">
                              <code>{cmd.code}</code>
                            </pre>
                            <div className="p-2 border-t border-slate-600 flex justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyCode(cmd.code)}
                                className="text-slate-400 hover:text-white"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Connection Script */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">🔌 Script de Conexão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-900/50 rounded-lg overflow-hidden">
                    <pre className="p-4 text-sm text-blue-400 overflow-x-auto">
                      <code>{config.scripts.connection}</code>
                    </pre>
                    <div className="p-2 border-t border-slate-600 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCode(config.scripts.connection)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Toast History */}
      {toasts.length > 0 && (
        <div className="max-w-7xl mx-auto mt-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">📜 Histórico de Operações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {toasts.map((t) => (
                  <div 
                    key={t.id}
                    className={`p-3 rounded-lg border ${
                      t.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                      t.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                      t.type === 'command' ? 'bg-amber-500/10 border-amber-500/30' :
                      'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium text-sm">{t.title}</span>
                      <span className="text-slate-500 text-xs">
                        {t.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{t.message}</p>
                    {t.code && (
                      <pre className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-green-400 overflow-x-auto">
                        {t.code.slice(0, 200)}...
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default DatabaseToastDemo;
