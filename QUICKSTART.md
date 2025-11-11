# 🚀 Quick Start Guide - EDN Blockchain Recorder

Get your production system running in 10 minutes!

## Prerequisites

✅ Hostinger VPS with Ubuntu (or any Ubuntu VPS)  
✅ Domain name pointed to your VPS IP  
✅ Smart contract deployed on Base Sepolia: `0x577022B59D1c25323AB524fe78d2f6347b5C69f0`  
✅ Private key with some ETH for gas  
✅ SSH access to your VPS

## Step 1: Upload Project Files

**Download all files from the project directory and upload to your VPS:**

```bash
# From your local machine
scp -r edn-blockchain-recorder root@your-vps-ip:/root/
```

**Or clone from git if you've pushed it:**
```bash
ssh root@your-vps-ip
git clone your-repository-url
cd edn-blockchain-recorder
```

## Step 2: Configure Environment

```bash
cd backend
cp .env.example .env
nano .env  # or use vi/vim
```

**Required Configuration:**
```env
NODE_ENV=production
PORT=3000

# Your contract address from Base Sepolia
CONTRACT_ADDRESS=0x577022B59D1c25323AB524fe78d2f6347b5C69f0

# Your wallet private key (KEEP SECRET!)
PRIVATE_KEY=0x...your_private_key_here

# Your domain
ALLOWED_ORIGINS=https://yourdomain.com
```

Save and exit (Ctrl+X, Y, Enter in nano)

## Step 3: Update Deployment Script

```bash
cd /root/edn-blockchain-recorder/deployment
nano deploy.sh
```

Update the DOMAIN variable at the top:
```bash
DOMAIN="yourdomain.com"
```

Save and exit.

## Step 4: Run Deployment

```bash
chmod +x deployment/deploy.sh
bash deployment/deploy.sh
```

The script will automatically:
- Install Node.js, PM2, Nginx
- Setup SSL certificate with Let's Encrypt
- Start your application
- Configure firewall

**This takes about 5-10 minutes.**

## Step 5: Verify Everything Works

```bash
# Check PM2 status
pm2 status

# Check application health
curl https://yourdomain.com/health

# View logs
pm2 logs edn-blockchain-recorder
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-10T...",
  "service": "edn-blockchain-recorder",
  "version": "2.0.0"
}
```

## Step 6: Update EDN Webhook

Update your EDN webhook URL to:
```
https://yourdomain.com/webhook/transaction
```

## Step 7: Grant Access to Users

Users need authorization to view transactions.

**Using Basescan:**
1. Go to https://sepolia.basescan.org/address/0x577022B59D1c25323AB524fe78d2f6347b5C69f0#writeContract
2. Connect your wallet (must be contract owner)
3. Find `grantAccess` function
4. Enter user's wallet address
5. Click "Write"

## Test Your Setup

### Test Webhook

```bash
curl -X POST https://yourdomain.com/webhook/transaction \
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

### Test API

```bash
# Get recent transactions
curl https://yourdomain.com/api/transactions/recent

# Get analytics
curl https://yourdomain.com/api/analytics/overview
```

## Useful Commands

```bash
# View live logs
pm2 logs edn-blockchain-recorder

# Restart application
pm2 restart edn-blockchain-recorder

# Monitor resources
pm2 monit

# Check Nginx status
systemctl status nginx
```

## Troubleshooting

**Application won't start:**
```bash
pm2 logs edn-blockchain-recorder --lines 50
cat backend/.env  # Verify configuration
```

**SSL certificate failed:**
```bash
dig yourdomain.com  # Verify DNS
certbot --nginx -d yourdomain.com
```

**Port already in use:**
```bash
lsof -i :3000
kill -9 PID
```

## 🎉 Done!

Your EDN Blockchain Recorder is now live at `https://yourdomain.com`

**Next Steps:**
1. Monitor logs for 24 hours
2. Test with real EDN webhook data
3. Grant access to your team
4. Set up monitoring (optional)

---

For detailed documentation, see [README.md](./README.md)
