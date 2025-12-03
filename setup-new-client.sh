#!/bin/bash
# ==============================================================================
# Script de Setup Inicial - Sistema de Pedidos para Restaurantes
# ==============================================================================
# Execute: chmod +x setup-new-client.sh && ./setup-new-client.sh
# ==============================================================================

echo "🍔 Setup do Sistema de Pedidos para Restaurantes"
echo "=================================================="
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js 18+ primeiro."
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Copiar arquivos de exemplo
echo ""
echo "📋 Copiando arquivos de exemplo..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   ✅ .env criado"
else
    echo "   ⏭️  .env já existe, pulando..."
fi

if [ ! -f "cardapio.json" ]; then
    cp cardapio.example.json cardapio.json
    echo "   ✅ cardapio.json criado"
else
    echo "   ⏭️  cardapio.json já existe, pulando..."
fi

if [ ! -f "server/custom-settings.json" ]; then
    cp server/custom-settings.example.json server/custom-settings.json
    echo "   ✅ server/custom-settings.json criado"
else
    echo "   ⏭️  server/custom-settings.json já existe, pulando..."
fi

if [ ! -f "server/config/delivery.config.js" ]; then
    mkdir -p server/config
    cp server/config/delivery.config.example.js server/config/delivery.config.js
    echo "   ✅ server/config/delivery.config.js criado"
else
    echo "   ⏭️  server/config/delivery.config.js já existe, pulando..."
fi

# Criar diretórios necessários
echo ""
echo "📁 Criando diretórios..."

mkdir -p server/uploads
echo "   ✅ server/uploads"

mkdir -p server/whatsapp-sessions
echo "   ✅ server/whatsapp-sessions"

# Instalar dependências
echo ""
echo "📦 Instalando dependências..."

if [ -f "package.json" ]; then
    npm install
fi

cd server
npm install
cd ..

echo ""
echo "=================================================="
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "1. Edite o arquivo .env com suas configurações"
echo "2. Inicie o servidor: cd server && npm start"
echo "3. Acesse http://localhost:3005/install para configurar"
echo "=================================================="
