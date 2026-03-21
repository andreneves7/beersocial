# BeerSocial - Instrucoes para GitHub

## Passo 1: Criar Repositorio no GitHub

1. Vai a https://github.com/new
2. Nome do repositorio: `beersocial`
3. Descricao: `Social app para cervejas - como Vivino para beers`
4. **NAO** inicializes com README (deixa desmarcado)
5. Clica em "Create repository"

## Passo 2: Criar Personal Access Token

Como o GitHub ja nao aceita passwords, precisas de um token:

1. Vai a https://github.com/settings/tokens
2. Clica "Generate new token" → "Generate new token (classic)"
3. Nome: `BeerSocial Push`
4. Expiracao: 90 dias (ou o que preferires)
5. Seleciona: **repo** (todas as opcoes debaixo de repo)
6. Clica "Generate token"
7. **COPIA O TOKEN** - so aparece uma vez!

## Passo 3: Extrair e Preparar Projeto

1. Extrai `beersocial-github.zip` para:
   ```
   D:\uni\Pos\BDT-I\Projeto\beersocial-app\
   ```

2. Abre PowerShell ou CMD nessa pasta

## Passo 4: Executar Setup

### Opcao A: Script Automatico
```powershell
# Copia o script para a pasta e executa
.\setup-github.bat
```

### Opcao B: Comandos Manuais
```powershell
# Inicializa git
git init

# Adiciona remote
git remote add origin https://github.com/andreneves7/beersocial.git

# Adiciona todos os ficheiros
git add -A

# Commit
git commit -m "BeerSocial - Social app para cervejas"

# Push (pedira credenciais)
git push -u origin master
```

## Credenciais quando pedido

| Campo | Valor |
|-------|-------|
| Username | `andreneves7` |
| Password | `O teu Personal Access Token` |

## Apos o Push

O repositorio estara disponivel em:
**https://github.com/andreneves7/beersocial**

---

## Estrutura do Projeto

```
beersocial/
├── src/
│   ├── app/              # Paginas Next.js
│   │   ├── api/          # API Routes
│   │   ├── databases/    # Dashboard BD
│   │   └── page.tsx      # Pagina principal
│   ├── components/
│   │   ├── app/          # Componentes da app
│   │   └── ui/           # shadcn/ui
│   ├── lib/              # Clientes DB (Redis, Mongo, Cassandra)
│   └── hooks/            # React hooks
├── public/
│   ├── icons/            # PWA icons
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service Worker
├── docker/               # Scripts init DB
├── docker-compose.yml    # Containers
└── package.json
```

## Tecnologias

| Database | Container | Porta | Uso |
|----------|-----------|-------|-----|
| Redis | bdt-i-ambiente-redis-1 | 6379 | Cache, sessoes |
| MongoDB | bdt-i-ambiente-mongodb-1 | 27017 | Users, reviews |
| Cassandra | bdt-i-ambiente-cassandra-1 | 9042 | Timeline, messages |

## Executar o Projeto

```powershell
# Instalar dependencias
npm install

# Correr em desenvolvimento
npm run dev

# Aceder
http://localhost:3000
```
