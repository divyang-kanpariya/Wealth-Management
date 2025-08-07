# Deployment Guide

This guide covers different deployment options for the Personal Wealth Management application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Deployment Options](#deployment-options)
   - [Docker Deployment](#docker-deployment)
   - [Vercel Deployment](#vercel-deployment)
   - [Manual Server Deployment](#manual-server-deployment)
5. [Production Checklist](#production-checklist)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18 or higher
- MySQL 8.0 or higher
- Docker and Docker Compose (for containerized deployment)
- SSL certificate (for production)

## Environment Configuration

Create a `.env.production` file with the following variables:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/wealth_management"

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Security
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=https://yourdomain.com

# External APIs (Optional)
NSE_API_KEY=your-nse-api-key
AMFI_API_KEY=your-amfi-api-key

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
ANALYTICS_ID=your-analytics-id
```

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE wealth_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wealth_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON wealth_management.* TO 'wealth_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Run Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 3. Seed Initial Data (Optional)

```bash
npx prisma db seed
```

## Deployment Options

### Docker Deployment

#### 1. Build and Run with Docker Compose

```bash
# Clone the repository
git clone <repository-url>
cd personal-wealth-management

# Copy environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production

# Build and start services
docker-compose up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy
```

#### 2. Individual Docker Commands

```bash
# Build the image
docker build -t wealth-management .

# Run the container
docker run -d \
  --name wealth-app \
  -p 3000:3000 \
  --env-file .env.production \
  wealth-management
```

### Vercel Deployment

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Configure Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### 3. Environment Variables

Set the following environment variables in Vercel dashboard:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

#### 4. Database Configuration

For Vercel deployment, consider using:
- PlanetScale (MySQL-compatible)
- Supabase (PostgreSQL)
- Railway (MySQL/PostgreSQL)

### Manual Server Deployment

#### 1. Server Setup (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Install MySQL
sudo apt install mysql-server
```

#### 2. Application Setup

```bash
# Clone repository
git clone <repository-url>
cd personal-wealth-management

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

#### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'wealth-management',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 4. Nginx Configuration

Create `/etc/nginx/sites-available/wealth-management`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/wealth-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Production Checklist

### Security

- [ ] SSL certificate installed and configured
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Security headers configured

### Performance

- [ ] Static assets optimized
- [ ] Database indexes created
- [ ] Caching configured
- [ ] CDN setup (if applicable)
- [ ] Gzip compression enabled

### Monitoring

- [ ] Error tracking setup (Sentry)
- [ ] Performance monitoring
- [ ] Database monitoring
- [ ] Uptime monitoring
- [ ] Log aggregation

### Backup

- [ ] Database backup strategy
- [ ] File backup strategy
- [ ] Backup restoration tested
- [ ] Backup retention policy

## Monitoring and Maintenance

### Health Checks

The application provides health check endpoints:

- `/api/health` - Application health
- `/api/health/db` - Database connectivity
- `/api/health/external` - External API status

### Logs

Monitor application logs:

```bash
# PM2 logs
pm2 logs wealth-management

# Docker logs
docker-compose logs -f app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Maintenance

```bash
# Backup database
mysqldump -u username -p wealth_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Optimize database
mysql -u username -p -e "OPTIMIZE TABLE investments, goals, accounts, price_cache;"

# Check database size
mysql -u username -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema='wealth_management';"
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm ci --only=production

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Restart application
pm2 restart wealth-management
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database status
sudo systemctl status mysql

# Check connection
mysql -u username -p -e "SELECT 1;"

# Check Prisma connection
npx prisma db pull
```

#### 2. Application Won't Start

```bash
# Check logs
pm2 logs wealth-management

# Check port availability
sudo netstat -tlnp | grep :3000

# Check environment variables
pm2 env wealth-management
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in cert.pem -text -noout

# Test SSL configuration
sudo nginx -t
```

#### 4. Performance Issues

```bash
# Check system resources
htop
df -h
free -h

# Check database performance
mysql -u username -p -e "SHOW PROCESSLIST;"

# Check application metrics
pm2 monit
```

### Getting Help

1. Check application logs first
2. Review this deployment guide
3. Check the project's GitHub issues
4. Contact the development team

## Security Considerations

1. **Regular Updates**: Keep all dependencies updated
2. **Access Control**: Implement proper user authentication
3. **Data Encryption**: Encrypt sensitive data at rest
4. **Network Security**: Use VPN for database access
5. **Audit Logs**: Maintain audit trails for sensitive operations
6. **Backup Security**: Encrypt backups and test restoration

## Performance Optimization

1. **Database Indexing**: Ensure proper indexes on frequently queried columns
2. **Caching**: Implement Redis for session and data caching
3. **CDN**: Use CDN for static assets
4. **Image Optimization**: Optimize images and use WebP format
5. **Code Splitting**: Implement proper code splitting in Next.js
6. **Database Connection Pooling**: Configure connection pooling

Remember to test your deployment thoroughly in a staging environment before going to production!