# ==============================================================================
# Script de Setup Inicial - Sistema de Pedidos para Restaurantes (Windows)
# ==============================================================================
# Execute no PowerShell: .\setup-new-client.ps1
# ==============================================================================

Write-Host "🍔 Setup do Sistema de Pedidos para Restaurantes" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Verificar se Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Por favor, instale Node.js 18+ primeiro." -ForegroundColor Red
    exit 1
}

# Copiar arquivos de exemplo
Write-Host ""
Write-Host "📋 Copiando arquivos de exemplo..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "   ✅ .env criado" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  .env já existe, pulando..." -ForegroundColor Yellow
}

if (-not (Test-Path "cardapio.json")) {
    Copy-Item "cardapio.example.json" "cardapio.json"
    Write-Host "   ✅ cardapio.json criado" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  cardapio.json já existe, pulando..." -ForegroundColor Yellow
}

if (-not (Test-Path "server\custom-settings.json")) {
    Copy-Item "server\custom-settings.example.json" "server\custom-settings.json"
    Write-Host "   ✅ server\custom-settings.json criado" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  server\custom-settings.json já existe, pulando..." -ForegroundColor Yellow
}

if (-not (Test-Path "server\config\delivery.config.js")) {
    New-Item -ItemType Directory -Path "server\config" -Force | Out-Null
    Copy-Item "server\config\delivery.config.example.js" "server\config\delivery.config.js"
    Write-Host "   ✅ server\config\delivery.config.js criado" -ForegroundColor Green
} else {
    Write-Host "   ⏭️  server\config\delivery.config.js já existe, pulando..." -ForegroundColor Yellow
}

# Criar diretórios necessários
Write-Host ""
Write-Host "📁 Criando diretórios..." -ForegroundColor Cyan

New-Item -ItemType Directory -Path "server\uploads" -Force | Out-Null
Write-Host "   ✅ server\uploads" -ForegroundColor Green

New-Item -ItemType Directory -Path "server\whatsapp-sessions" -Force | Out-Null
Write-Host "   ✅ server\whatsapp-sessions" -ForegroundColor Green

# Instalar dependências
Write-Host ""
Write-Host "📦 Instalando dependências..." -ForegroundColor Cyan

if (Test-Path "package.json") {
    npm install
}

Set-Location server
npm install
Set-Location ..

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "✅ Setup concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Edite o arquivo .env com suas configurações"
Write-Host "2. Inicie o servidor: cd server; npm start"
Write-Host "3. Acesse http://localhost:3005/install para configurar"
Write-Host "==================================================" -ForegroundColor Green
