# EDN Blockchain Recorder v2.0 - Production Ready

Complete webhook-to-blockchain recording system with analytics dashboard for EDN transactions on Base Sepolia.

## 🏗️ Architecture

```
EDN Webhook → Express Server → Validation → Base Sepolia Blockchain
                    ↓
              Analytics Service → Cache → Dashboard
```

## ✨ Features

### Backend
- ✅ **Webhook Receiver**: Validates and processes EDN production webhooks
- ✅ **Blockchain Recording**: Immutable storage on Base Sepolia
- ✅ **Minimal Server Storage**: In-memory caching only, blockchain as source of truth
- ✅ **Analytics Engine**: Real-time dashboard metrics and transaction filtering
- ✅ **Error Handling**: Retry logic with exponential backoff and circuit breaker
- ✅ **WebSocket Support**: Real-time transaction updates
- ✅ **Production Ready**: PM2, Nginx, SSL, rate limiting, logging

### Dashboard
- 📊 Overview statistics (total transactions, volume, trends)
- 🔍 Advanced transaction filtering (date, type, empresa, amount, status)
- 📈 Analytics by transaction type and empresa
- 🔴 Real-time updates via WebSocket
- 🔐 Wallet-based authentication

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Hostinger VPS with Ubuntu
- Domain name pointed to VPS
- Base Sepolia RPC access
- Deployed smart contract on Base Sepolia
- Private key with ETH for gas

### 1. Clone Repository

```bash
git clone <repository-url>
cd edn-blockchain-recorder
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

### 3. Configure Environment

Edit `backend/.env`:

```env
NODE_ENV=production
PORT=3000

# Blockchain
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CONTRACT_ADDRESS=0x577022B59D1c25323AB524fe78d2f6347b5C69f0
PRIVATE_KEY=your_private_key_here

# Security
API_KEY=your_secret_api_key
JWT_SECRET=your_jwt_secret

# CORS
ALLOWED_ORIGINS=https://yourdomain.com

# Cache & Performance
CACHE_TTL=300
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Deploy to VPS

```bash
# Make deployment script executable
chmod +x deployment/deploy.sh

# Run deployment (as root)
sudo bash deployment/deploy.sh
```

The deployment script will:
1. Install Node.js, PM2, Nginx, Certbot
2. Copy application files
3. Install dependencies
4. Configure Nginx reverse proxy
5. Setup SSL with Let's Encrypt
6. Start application with PM2
7. Configure firewall

### 5. Verify Deployment

```bash
# Check application status
pm2 status

# View logs
pm2 logs edn-blockchain-recorder

# Check health
curl https://yourdomain.com/health
```

## 📡 API Endpoints

### Webhook

```bash
POST /webhook/transaction
Content-Type: application/json

# Body: EDN webhook payload
```

### Transactions

```bash
# Get by UUID
GET /api/transaction/:uuid
Authorization: Bearer 0xYourWalletAddress

# Get by empresa
GET /api/transactions/empresa/:empresaId?page=1&limit=20
Authorization: Bearer 0xYourWalletAddress

# Filter transactions
GET /api/transactions/filter?type=credit&startDate=2025-01-01&empresaId=1
Authorization: Bearer 0xYourWalletAddress

# Recent transactions
GET /api/transactions/recent?limit=10
```

### Analytics

```bash
# Overview statistics
GET /api/analytics/overview

# By transaction type
GET /api/analytics/by-type

# By empresa
GET /api/analytics/empresa/:empresaId
Authorization: Bearer 0xYourWalletAddress

# Trends
GET /api/analytics/trends?period=month
```

### WebSocket

```javascript
const ws = new WebSocket('wss://yourdomain.com/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.event === 'new_transaction') {
    console.log('New transaction:', data.data);
  }
};
```

## 🔐 Access Management

Grant access to wallet addresses:

```javascript
// Using ethers.js
const contract = new ethers.Contract(contractAddress, abi, wallet);
await contract.grantAccess("0xUserWalletAddress");
```

Or via Basescan:
1. Go to contract on Basescan
2. Navigate to "Write Contract" tab
3. Connect wallet (owner)
4. Call `grantAccess` with user address

## 🛠️ Development

### Local Development

```bash
cd backend
npm install
npm run dev
```

### Run Tests

```bash
npm test
```

### View Logs

```bash
# PM2 logs
pm2 logs edn-blockchain-recorder

# Application logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# Nginx logs
tail -f /var/log/nginx/edn-blockchain-error.log
```

## 📊 Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Status of all processes
pm2 status

# Restart application
pm2 restart edn-blockchain-recorder

# Detailed logs
pm2 logs edn-blockchain-recorder --lines 100
```

### Health Checks

```bash
# Basic health
curl https://yourdomain.com/health

# Detailed health (requires auth)
curl -H "Authorization: Bearer 0xYourAddress" \
  https://yourdomain.com/health/detailed
```

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest changes
cd /var/www/edn-blockchain-recorder
git pull

# Install dependencies
cd backend
npm install --production

# Restart with PM2
pm2 restart edn-blockchain-recorder
```

### Database Maintenance

No database! All data is on blockchain. Cache is in-memory and auto-managed.

### Backup

```bash
# Backup .env file
cp backend/.env backend/.env.backup

# Backup PM2 ecosystem
pm2 save

# Backup Nginx config
cp /etc/nginx/sites-available/edn-blockchain-recorder \
   /etc/nginx/sites-available/edn-blockchain-recorder.backup
```

## 🧪 Testing Webhook

```bash
# Test webhook locally
curl -X POST http://localhost:3000/webhook/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "transaction.created",
    "timestamp": "2025-11-10T12:00:00Z",
    "transaction": {
      "id": 1,
      "type": "credit",
      "amount": 100.50,
      "empresa_id": 1,
      "parceiro_negocio_id": 1,
      "celular_id": 1,
      "moeda_id": 1,
      "plataforma_id": 1,
      "transacao_tipo_id": 1,
      "status": "confirmed",
      "created_at": "2025-11-10T12:00:00Z",
      "table": "transactions",
      "operation": "INSERT",
      "data_controle": "2025-11-10",
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "versao": "1.0"
    }
  }'
```

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs edn-blockchain-recorder --lines 50

# Verify .env configuration
cat backend/.env

# Check contract deployment
node -e "import('./backend/src/config/blockchain.config.js').then(m => m.verifyContractDeployment())"
```

### High Gas Costs

- Check Base Sepolia gas prices
- Ensure wallet has sufficient ETH
- Review gas buffer settings in `blockchain.config.js`

### Cache Issues

```bash
# Restart to clear in-memory cache
pm2 restart edn-blockchain-recorder
```

### Nginx 502 Error

```bash
# Check if backend is running
pm2 status

# Check Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

## 📦 Project Structure

```
edn-blockchain-recorder/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── contracts/
│   │   └── server.js
│   ├── logs/
│   ├── package.json
│   └── ecosystem.config.js
├── deployment/
│   ├── nginx.conf
│   └── deploy.sh
└── README.md
```

## 🔗 Links

- Smart Contract: https://sepolia.basescan.org/address/0x577022B59D1c25323AB524fe78d2f6347b5C69f0
- Base Sepolia Explorer: https://sepolia.basescan.org
- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-sepolia-faucet

## 📝 License

MIT

## 🤝 Support

For issues and questions:
1. Check logs: `pm2 logs edn-blockchain-recorder`
2. Review health check: `curl https://yourdomain.com/health/detailed`
3. Check blockchain explorer for transaction details

## 🔒 Security Considerations

1. **Never commit `.env` file** - Contains private keys
2. **Rotate API keys regularly**
3. **Monitor wallet balance** for gas
4. **Keep dependencies updated**: `npm audit fix`
5. **Review Nginx logs** for suspicious activity
6. **Use strong firewall rules**
7. **Enable fail2ban** for SSH protection

## 🚦 Production Checklist

- [ ] Deploy smart contract to Base Sepolia
- [ ] Configure .env with production values
- [ ] Setup domain DNS
- [ ] Run deployment script
- [ ] Verify SSL certificate
- [ ] Test webhook endpoint
- [ ] Grant access to authorized addresses
- [ ] Update EDN webhook URL
- [ ] Monitor logs for 24 hours
- [ ] Setup monitoring alerts (optional)
- [ ] Document recovery procedures
- [ ] Backup configuration files
