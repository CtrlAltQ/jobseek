# AI Job Finder - Deployment Guide

This guide covers deploying the AI Job Finder platform to production environments.

## Architecture Overview

The AI Job Finder consists of two main components:
- **Frontend/API**: Next.js application deployed to Vercel
- **Python Agents**: Background job scrapers deployed to Render with CRON scheduling

## Prerequisites

### Required Tools
- Node.js 18+ and npm
- Python 3.9+
- Git
- Vercel CLI (`npm i -g vercel`)
- Sentry account (optional, for monitoring)

### Required Environment Variables

#### Vercel (Frontend/API)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-job-finder
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=sntrys_...
```

#### Render (Python Agents)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-job-finder
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
API_BASE_URL=https://your-domain.vercel.app
SENTRY_DSN=https://...@sentry.io/...
ENVIRONMENT=production
```

## Quick Deployment

### Automated Deployment
Use the deployment script for a complete deployment:

```bash
# Deploy everything
./scripts/deploy.sh

# Deploy only frontend
./scripts/deploy.sh --vercel-only

# Deploy only agents
./scripts/deploy.sh --render-only

# Skip tests (faster deployment)
./scripts/deploy.sh --skip-tests
```

### Manual Deployment

#### 1. Deploy Frontend to Vercel

```bash
# Install dependencies
npm ci

# Build the application
npm run build

# Deploy to Vercel
vercel --prod
```

#### 2. Deploy Agents to Render

1. Connect your GitHub repository to Render
2. Create a new Cron Job service
3. Use these settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Schedule**: `0 */4 * * *` (every 4 hours)
   - **Root Directory**: `agents`

## Environment Configuration

### Development
```bash
NODE_ENV=development
ENVIRONMENT=development
```

### Staging
```bash
NODE_ENV=staging
ENVIRONMENT=staging
```

### Production
```bash
NODE_ENV=production
ENVIRONMENT=production
```

## Monitoring Setup

### 1. Set up Sentry (Recommended)

```bash
# Run the monitoring setup script
./scripts/setup-monitoring.sh

# Or manually configure
export SENTRY_ORG=your-org
export SENTRY_PROJECT=ai-job-finder
export SENTRY_AUTH_TOKEN=your-token
```

### 2. Health Check Endpoints

The application provides several health check endpoints:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information
- `GET /api/agents/status` - Agent status information

### 3. Agent Health Monitoring

```bash
# Check agent health locally
cd agents
python health_check.py

# Get JSON output
python health_check.py --json
```

## Database Setup

### MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas cluster
2. Create a database user with read/write permissions
3. Whitelist your deployment IPs (or use 0.0.0.0/0 for development)
4. Get the connection string and set as `MONGODB_URI`

### Collections Created Automatically
- `jobs` - Job postings discovered by agents
- `agent_logs` - Agent execution logs and status
- `settings` - User preferences and configuration

## Troubleshooting

### Common Issues

#### Vercel Deployment Fails
```bash
# Check build logs
vercel logs

# Verify environment variables
vercel env ls

# Test build locally
npm run build
```

#### Render Agents Not Running
```bash
# Check Render logs in dashboard
# Verify environment variables are set
# Test agent health check
python agents/health_check.py
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongosh "your-connection-string"

# Check network access in MongoDB Atlas
# Verify connection string format
```

### Health Check Failures

#### API Health Check
```bash
# Test health endpoint
curl https://your-domain.vercel.app/health

# Check detailed health
curl https://your-domain.vercel.app/health/detailed
```

#### Agent Health Check
```bash
# Run agent health check
cd agents
python health_check.py

# Check specific components
python -c "import requests; print(requests.get('API_URL/health').json())"
```

## Performance Optimization

### Frontend Optimization
- Enable Vercel Analytics
- Configure proper caching headers
- Optimize images and assets
- Use Next.js Image component

### Agent Optimization
- Adjust scraping delays based on source requirements
- Monitor rate limiting
- Implement proper error handling and retries
- Use connection pooling for database operations

## Security Considerations

### Environment Variables
- Never commit sensitive keys to version control
- Use Vercel/Render environment variable management
- Rotate API keys regularly
- Use least-privilege database access

### API Security
- Implement rate limiting
- Validate all inputs
- Use HTTPS only
- Monitor for suspicious activity

### Scraping Ethics
- Respect robots.txt files
- Implement reasonable delays
- Monitor for IP blocking
- Use rotating user agents if necessary

## Scaling Considerations

### Horizontal Scaling
- Vercel automatically scales the frontend
- Render can run multiple agent instances
- MongoDB Atlas provides automatic scaling

### Performance Monitoring
- Monitor response times
- Track error rates
- Monitor database performance
- Set up alerting for critical issues

## Backup and Recovery

### Database Backups
- MongoDB Atlas provides automatic backups
- Consider additional backup strategies for critical data
- Test restore procedures regularly

### Code Backups
- Use Git for version control
- Tag releases for easy rollback
- Maintain staging environment for testing

## Support and Maintenance

### Regular Maintenance Tasks
- Update dependencies monthly
- Monitor error rates and performance
- Review and rotate API keys
- Update scraping logic as job sites change

### Monitoring Checklist
- [ ] Health checks are passing
- [ ] Agents are running on schedule
- [ ] Error rates are within acceptable limits
- [ ] Database performance is optimal
- [ ] Monitoring alerts are configured

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)