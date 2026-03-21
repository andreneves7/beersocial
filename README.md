# 🍺 BeerSocial

Uma aplicação social para amantes de cerveja - descobre, avalia e partilha as tuas cervejas favoritas.

## 🗄️ Arquitetura Poliglota

Este projeto usa **3 bases de dados** especializadas:

| Base de Dados | Propósito | Porta |
|---------------|-----------|-------|
| **Redis** | Cache, Sessões, Contadores, Rate Limiting | 6379 |
| **MongoDB** | Users, Beers, Reviews (embedded comments) | 27017 |
| **Cassandra** | Timeline, Messages (partition key design) | 9042 |

## 📊 Dashboard de Bases de Dados

Acede ao dashboard para ver os comandos e scripts de cada BD:

```
http://localhost:3000/databases
```

## 🚀 Como Correr

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar `.env`
```env
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=beersocial
CASSANDRA_CONTACT_POINTS=localhost
CASSANDRA_DC=datacenter1
CASSANDRA_KEYSPACE=beersocial
```

### 3. Iniciar containers Docker
```bash
docker-compose up -d
```

### 4. Inicializar bases de dados
```bash
bash setup-databases.sh
```

### 5. Correr a aplicação
```bash
npm run dev
```

### 6. Abrir no browser
```
http://localhost:3000
```

## 📱 PWA (Progressive Web App)

A aplicação pode ser instalada como app no telemóvel:

1. Abre `http://localhost:3000` no Chrome/Safari
2. Toca em "Adicionar ao ecrã inicial"

## 🔧 Tecnologias

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Bases de Dados:** Redis, MongoDB, Cassandra
- **Containerização:** Docker Compose

## 📁 Estrutura

```
src/
├── app/
│   ├── page.tsx              # Página principal
│   ├── databases/page.tsx    # Dashboard BD
│   └── api/
│       ├── status/           # Status das BDs
│       ├── redis/            # Endpoints Redis
│       ├── mongo/            # Endpoints MongoDB
│       └── cassandra/        # Endpoints Cassandra
├── components/
│   ├── app/                  # Componentes da app
│   └── ui/                   # Componentes UI (shadcn)
└── lib/
    ├── redis-client.ts       # Cliente Redis
    ├── mongodb-client.ts     # Cliente MongoDB
    └── cassandra-client.ts   # Cliente Cassandra
```

## 🍺 Funcionalidades

- 📝 Catálogo de cervejas
- ⭐ Reviews e ratings
- 💬 Comentários
- 👥 Sistema de amigos
- 💬 Chat privado
- 🔔 Notificações
- 📱 App instalável (PWA)
- 🔌 Funciona offline

## 📄 Licença

MIT
