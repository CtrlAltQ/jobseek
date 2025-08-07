#!/bin/bash

# Monitoring Setup Script
# Sets up Sentry and other monitoring tools for the AI Job Finder

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 Setting up monitoring for AI Job Finder${NC}"
echo "=============================================="

# Check if Sentry CLI is installed
setup_sentry_cli() {
    echo -e "${YELLOW}Setting up Sentry CLI...${NC}"
    
    if ! command -v sentry-cli &> /dev/null; then
        echo "Installing Sentry CLI..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            brew install getsentry/tools/sentry-cli
        else
            # Linux
            curl -sL https://sentry.io/get-cli/ | bash
        fi
    else
        echo "Sentry CLI already installed"
    fi
    
    echo -e "${GREEN}✅ Sentry CLI setup complete${NC}"
}

# Configure Sentry project
configure_sentry() {
    echo -e "${YELLOW}Configuring Sentry project...${NC}"
    
    if [[ -z "$SENTRY_AUTH_TOKEN" ]]; then
        echo -e "${RED}❌ SENTRY_AUTH_TOKEN not set. Please set this environment variable.${NC}"
        echo "Get your token from: https://sentry.io/settings/account/api/auth-tokens/"
        exit 1
    fi
    
    if [[ -z "$SENTRY_ORG" ]]; then
        echo -e "${RED}❌ SENTRY_ORG not set. Please set this environment variable.${NC}"
        exit 1
    fi
    
    if [[ -z "$SENTRY_PROJECT" ]]; then
        echo -e "${RED}❌ SENTRY_PROJECT not set. Please set this environment variable.${NC}"
        exit 1
    fi
    
    # Create .sentryclirc file
    cat > .sentryclirc << EOF
[defaults]
url=https://sentry.io/
org=${SENTRY_ORG}
project=${SENTRY_PROJECT}

[auth]
token=${SENTRY_AUTH_TOKEN}
EOF
    
    echo -e "${GREEN}✅ Sentry configuration complete${NC}"
}

# Setup source maps upload
setup_sourcemaps() {
    echo -e "${YELLOW}Setting up source maps upload...${NC}"
    
    # Add build script for source maps
    npm pkg set scripts.build:sentry="next build && sentry-cli sourcemaps inject --org \$SENTRY_ORG --project \$SENTRY_PROJECT .next && sentry-cli sourcemaps upload --org \$SENTRY_ORG --project \$SENTRY_PROJECT .next"
    
    echo -e "${GREEN}✅ Source maps upload configured${NC}"
}

# Create monitoring dashboard config
create_dashboard_config() {
    echo -e "${YELLOW}Creating monitoring dashboard configuration...${NC}"
    
    mkdir -p config/monitoring
    
    cat > config/monitoring/dashboard.json << 'EOF'
{
  "dashboards": {
    "main": {
      "title": "AI Job Finder - Main Dashboard",
      "widgets": [
        {
          "title": "Error Rate",
          "type": "line_chart",
          "queries": [
            {
              "name": "Errors",
              "query": "event.type:error",
              "aggregation": "count()"
            }
          ]
        },
        {
          "title": "Response Time",
          "type": "line_chart", 
          "queries": [
            {
              "name": "API Response Time",
              "query": "transaction.op:http.server",
              "aggregation": "avg(transaction.duration)"
            }
          ]
        },
        {
          "title": "Agent Activity",
          "type": "table",
          "queries": [
            {
              "name": "Agent Runs",
              "query": "tags.component:agent",
              "aggregation": "count()"
            }
          ]
        }
      ]
    },
    "agents": {
      "title": "AI Job Finder - Agents Dashboard",
      "widgets": [
        {
          "title": "Scraper Errors",
          "type": "line_chart",
          "queries": [
            {
              "name": "Scraper Errors",
              "query": "tags.component:scraper AND level:error",
              "aggregation": "count()"
            }
          ]
        },
        {
          "title": "Jobs Discovered",
          "type": "number",
          "queries": [
            {
              "name": "Jobs Found",
              "query": "message:\"jobs found\"",
              "aggregation": "sum(extra.jobs_count)"
            }
          ]
        }
      ]
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Dashboard configuration created${NC}"
}

# Setup health check monitoring
setup_health_monitoring() {
    echo -e "${YELLOW}Setting up health check monitoring...${NC}"
    
    cat > scripts/health-monitor.sh << 'EOF'
#!/bin/bash

# Health monitoring script that can be run by external monitoring services

API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="${API_URL}/health"

# Check API health
echo "Checking API health at ${HEALTH_ENDPOINT}..."
response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "${HEALTH_ENDPOINT}")
http_code="${response: -3}"

if [[ "$http_code" == "200" ]]; then
    echo "✅ API is healthy"
    cat /tmp/health_response.json | jq '.'
    exit 0
else
    echo "❌ API health check failed (HTTP $http_code)"
    cat /tmp/health_response.json
    exit 1
fi
EOF
    
    chmod +x scripts/health-monitor.sh
    
    echo -e "${GREEN}✅ Health monitoring script created${NC}"
}

# Create alerting configuration
setup_alerting() {
    echo -e "${YELLOW}Setting up alerting configuration...${NC}"
    
    cat > config/monitoring/alerts.json << 'EOF'
{
  "alerts": [
    {
      "name": "High Error Rate",
      "condition": "count() > 10",
      "query": "event.type:error",
      "timeWindow": "5m",
      "severity": "critical",
      "channels": ["email", "slack"]
    },
    {
      "name": "API Response Time High",
      "condition": "avg(transaction.duration) > 5000",
      "query": "transaction.op:http.server",
      "timeWindow": "10m", 
      "severity": "warning",
      "channels": ["email"]
    },
    {
      "name": "Agent Not Running",
      "condition": "count() == 0",
      "query": "tags.component:agent",
      "timeWindow": "6h",
      "severity": "warning",
      "channels": ["email"]
    },
    {
      "name": "Database Connection Failed",
      "condition": "count() > 0",
      "query": "message:\"database connection failed\"",
      "timeWindow": "1m",
      "severity": "critical",
      "channels": ["email", "slack"]
    }
  ]
}
EOF
    
    echo -e "${GREEN}✅ Alerting configuration created${NC}"
}

# Main setup function
main() {
    echo "Starting monitoring setup..."
    
    setup_sentry_cli
    configure_sentry
    setup_sourcemaps
    create_dashboard_config
    setup_health_monitoring
    setup_alerting
    
    echo -e "${GREEN}🎉 Monitoring setup completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set up your Sentry project at https://sentry.io"
    echo "2. Configure environment variables: SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT"
    echo "3. Run './scripts/health-monitor.sh' to test health monitoring"
    echo "4. Deploy with './scripts/deploy.sh' to enable monitoring in production"
}

main "$@"