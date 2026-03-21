#!/bin/bash

# ============================================
# BeerSocial - Script de Inicialização
# ============================================

echo "🍺 BeerSocial - Iniciando ambiente..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se um container está running
check_container() {
    local container=$1
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${GREEN}✅ $container está running${NC}"
        return 0
    else
        echo -e "${RED}❌ $container não está running${NC}"
        return 1
    fi
}

# Função para esperar um container ficar ready
wait_for_container() {
    local container=$1
    local max_wait=60
    local count=0
    
    echo -e "${YELLOW}⏳ À espera que $container fique ready...${NC}"
    
    while [ $count -lt $max_wait ]; do
        if check_container "$container" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
        ((count++))
    done
    
    return 1
}

# Verificar se o Docker está a correr
echo "📦 Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está a correr! Inicia o Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker está running${NC}"
echo ""

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null
echo ""

# Iniciar containers
echo "🚀 Iniciando containers..."
docker-compose up -d

echo ""
echo "⏳ À espera que os containers fiquem prontos..."
echo ""

# Esperar Redis (rápido)
sleep 3
check_container "beersocial-redis"

# Esperar MongoDB (médio)
sleep 5
check_container "beersocial-mongodb"

# Esperar Cassandra (lento - pode demorar 30-60s)
echo ""
echo -e "${YELLOW}⏳ Cassandra demora ~30-60s a iniciar (paciência...)${NC}"
sleep 10

# Verificar Cassandra
for i in {1..12}; do
    if docker exec beersocial-cassandra cqlsh -e "describe keyspaces" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ beersocial-cassandra está ready${NC}"
        break
    fi
    echo "Tentativa $i/12 - Cassandra ainda a iniciar..."
    sleep 5
done

echo ""
echo "============================================"
echo "📊 STATUS DOS CONTAINERS"
echo "============================================"
docker-compose ps

echo ""
echo "============================================"
echo "🔗 LIGAÇÕES"
echo "============================================"
echo -e "Redis:     ${GREEN}localhost:6379${NC}"
echo -e "MongoDB:   ${GREEN}mongodb://beersocial:beersocial123@localhost:27017${NC}"
echo -e "Cassandra: ${GREEN}localhost:9042${NC}"

echo ""
echo "============================================"
echo "🧪 COMANDOS ÚTEIS"
echo "============================================"
echo "# Redis CLI:"
echo "  docker exec -it beersocial-redis redis-cli"
echo ""
echo "# MongoDB Shell:"
echo "  docker exec -it beersocial-mongodb mongosh -u beersocial -p beersocial123"
echo ""
echo "# Cassandra CQL:"
echo "  docker exec -it beersocial-cassandra cqlsh"

echo ""
echo -e "${GREEN}✅ Ambiente pronto!${NC}"
echo ""
echo "Para iniciar a app: bun run dev"
