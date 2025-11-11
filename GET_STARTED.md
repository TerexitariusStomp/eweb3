# 🎯 Getting Started with EDN Blockchain Recorder

## What You Have

A **production-ready, refactored codebase** for recording EDN webhook transactions to Base Sepolia blockchain with analytics dashboard.

### ✨ Key Features

✅ **Clean Architecture** - Services, controllers, middleware  
✅ **Production Hardened** - Error handling, retry logic, circuit breaker  
✅ **Minimal Storage** - In-memory caching only, blockchain as source of truth  
✅ **Analytics Dashboard** - Filtering, metrics, trends, real-time updates  
✅ **VPS Optimized** - PM2, Nginx, SSL automation  
✅ **Extensible** - Easy to add new features

## 📦 Project Structure

```
edn-blockchain-recorder/
├── README.md                 # Complete documentation
├── QUICKSTART.md            # 10-minute deployment
├── .gitignore               # Git ignore rules
│
├── backend/
│   ├── src/
│   │   ├── api/            # Controllers & Routes
│   │   ├── services/       # Business Logic
│   │   ├── middleware/     # Auth, Validation, Errors
│   │   ├── config/         # Configuration
│   │   ├── utils/          # Utilities
│   │   └── server.js       # Entry Point
│   ├── package.json
│   └── ecosystem.config.js  # PM2 config
│
└── deployment/
    ├── deploy.sh           # Automated deployment
    └── nginx.conf          # Nginx configuration
```

## 🚀 Quick Start (3 Steps)

### Step 1: Configure Environment

```bash
cd backend
cp .env.example .env
nano .env
```

**Add your values:**
```env
CONTRACT_ADDRESS=0x577022B59D1c25323AB524fe78d2f6347b5C69f0
PRIVATE_KEY=your_private_key_here
ALLOWED_ORIGINS=https://yourdomain.com
```

### Step 2: Upload to VPS

```bash
scp -r edn-blockchain-recorder root@your-vps-ip:/root/
```

### Step 3: Deploy

```bash
ssh root@your-vps-ip
cd /root/edn-blockchain-recorder/deployment
bash deploy.sh
```

**Done!** Your system is live at `https://yourdomain.com`

## 📖 Documentation

1. **QUICKSTART.md** ⚡ - Deploy in 10 minutes
2. **README.md** 📚 - Complete reference

## 🌟 Features

### Webhook Integration
- Endpoint: `POST /webhook/transaction`
- Validates with Joi schemas
- Records to Base Sepolia
- Rate limiting: 100 req/15min

### Analytics API
- `/api/analytics/overview` - Dashboard stats
- `/api/analytics/by-type` - By transaction type
- `/api/analytics/empresa/:id` - By empresa
- `/api/analytics/trends` - Time-based trends

### Transaction Filtering
```bash
GET /api/transactions/filter?type=credit&startDate=2025-01-01&empresaId=1
```
Supports: date, type, empresa, amount, status, pagination, sorting

### Real-time Updates
- WebSocket: `wss://yourdomain.com/ws`
- Broadcasts new transactions
- Heartbeat monitoring

## 🔧 API Examples

**Test Webhook:**
```bash
curl -X POST https://yourdomain.com/webhook/transaction \
  -H "Content-Type: application/json" \
  -d @webhook-payload.json
```

**Query Transaction:**
```bash
curl https://yourdomain.com/api/transaction/uuid-here \
  -H "Authorization: Bearer 0xYourAddress"
```

**Get Analytics:**
```bash
curl https://yourdomain.com/api/analytics/overview
```

## 🛠️ Common Commands

```bash
# View logs
pm2 logs edn-blockchain-recorder

# Restart
pm2 restart edn-blockchain-recorder

# Monitor
pm2 monit

# Check health
curl https://yourdomain.com/health
```

## 📋 Pre-Deployment Checklist

- [ ] Contract deployed on Base Sepolia
- [ ] Private key with ETH for gas
- [ ] VPS with Ubuntu
- [ ] Domain pointing to VPS
- [ ] `.env` configured
- [ ] Domain set in `deploy.sh`

## 🎯 Next Steps

1. Deploy following QUICKSTART.md
2. Test webhook endpoint
3. Update EDN webhook URL
4. Grant access to users
5. Monitor for 24 hours

## 🆘 Need Help?

- Check logs: `pm2 logs edn-blockchain-recorder`
- Review health: `curl https://yourdomain.com/health`
- See README.md for detailed docs

---

**Version**: 2.0.0  
**Status**: Production Ready ✅

**Ready to deploy?** → [QUICKSTART.md](./QUICKSTART.md)
