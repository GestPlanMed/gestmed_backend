#!/bin/bash
set -e

# Carrega variáveis de ambiente do .env se existir
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

COMPOSE_ARGS=(-f docker-compose.yml)

if [ -n "${TRAEFIK_HOST}" ] && [ -f docker-compose.vps.yml ]; then
  COMPOSE_ARGS+=(-f docker-compose.vps.yml)
  echo "==> Deploy configurado para Traefik em ${TRAEFIK_HOST}"
fi

docker_compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

echo "==> Parando containers anteriores..."
docker_compose down

echo "==> Limpando recursos Docker não utilizados..."
docker image prune -f
docker container prune -f
docker network prune -f
docker volume prune -f --filter "label!=keep"
docker builder prune -f

echo "==> Fazendo build da imagem..."
docker_compose build --no-cache

echo "==> Subindo banco de dados..."
docker_compose up -d db

echo "==> Aguardando banco ficar pronto..."
until docker_compose exec db pg_isready -U "${POSTGRES_USER:-gestmed}" -d "${POSTGRES_DB:-gestmed_exams}" > /dev/null 2>&1; do
  sleep 1
done

echo "==> Rodando migrations..."
docker_compose run --rm api sh -c "npx prisma migrate deploy"

echo "==> Subindo a API..."
docker_compose up -d api

echo "==> Logs da API (Ctrl+C para sair):"
docker_compose logs -f api
