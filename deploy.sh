#!/bin/bash
set -e

# Carrega variáveis de ambiente do .env se existir
if [ -f .env ]; then
  set -a
  source .env
  set +a
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
docker builder prune -f

echo "==> Fazendo build da imagem..."
docker_compose build --no-cache

echo "==> Rodando migrations..."
docker_compose run --rm api sh -c "npx prisma migrate deploy"

echo "==> Subindo a API..."
docker_compose up -d api

echo "==> Logs da API (Ctrl+C para sair):"
docker_compose logs -f api
