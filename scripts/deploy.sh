#!/bin/bash

# AI Job Finder Deployment Script
# This script handles deployment to both Vercel (frontend/API) and Render (agents)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VERCEL_PROJECT_NAME="ai-job-finder"
RENDER_SERVICE_NAME="ai-job-finder-agents"

echo -e "${GREEN}🚀 AI Job Finder Deployment Script${NC}"
echo "=================================="

# Check if required tools are installed
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found. Install with: npm i -g vercel${NC}"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git not found. Please install Git.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Validate environment variables
validate_env() {
    echo -e "${YELLOW}Validating environment variables...${NC}"
    
    required_vars=(
        "MONGODB_URI"
        "OPENAI_API_KEY"
        "NEXT_PUBLIC_API_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        printf '%s\n' "${missing_vars[@]}"
        echo "Please set these variables before deploying."
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment variables validated${NC}"
}

# Run tests before deployment
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    
    # Frontend tests
    echo "Running frontend tests..."
    npm test -- --run --passWithNoTests
    
    # Python agent tests
    echo "Running Python agent tests..."
    cd agents
    python -m pytest tests/ -v
    cd ..
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Build the application
build_app() {
    echo -e "${YELLOW}Building application...${NC}"
    
    # Install dependencies
    npm ci
    
    # Build Next.js app
    npm run build
    
    echo -e "${GREEN}✅ Application built successfully${NC}"
}

# Deploy to Vercel
deploy_vercel() {
    echo -e "${YELLOW}Deploying to Vercel...${NC}"
    
    # Deploy to production
    vercel --prod --yes
    
    echo -e "${GREEN}✅ Deployed to Vercel successfully${NC}"
}

# Deploy agents to Render (via Git push)
deploy_render() {
    echo -e "${YELLOW}Deploying agents to Render...${NC}"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ Not in a Git repository. Render deployment requires Git.${NC}"
        exit 1
    fi
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes. Committing them now...${NC}"
        git add .
        git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    # Push to main branch (Render will auto-deploy)
    git push origin main
    
    echo -e "${GREEN}✅ Pushed to Git. Render will auto-deploy agents.${NC}"
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Check Vercel deployment
    echo "Checking Vercel health endpoint..."
    if curl -f -s "${NEXT_PUBLIC_API_URL}/health" > /dev/null; then
        echo -e "${GREEN}✅ Vercel deployment is healthy${NC}"
    else
        echo -e "${RED}❌ Vercel deployment health check failed${NC}"
        exit 1
    fi
    
    # Note: Render health check would require the service to be running
    echo -e "${YELLOW}ℹ️  Render deployment will be verified automatically by their platform${NC}"
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
}

# Main deployment function
main() {
    echo "Starting deployment process..."
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_BUILD=false
    DEPLOY_TARGET="all"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --vercel-only)
                DEPLOY_TARGET="vercel"
                shift
                ;;
            --render-only)
                DEPLOY_TARGET="render"
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-tests     Skip running tests"
                echo "  --skip-build     Skip building the application"
                echo "  --vercel-only    Deploy only to Vercel"
                echo "  --render-only    Deploy only to Render"
                echo "  -h, --help       Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_dependencies
    validate_env
    
    if [[ "$SKIP_TESTS" != true ]]; then
        run_tests
    fi
    
    if [[ "$SKIP_BUILD" != true ]]; then
        build_app
    fi
    
    case $DEPLOY_TARGET in
        "all")
            deploy_vercel
            deploy_render
            ;;
        "vercel")
            deploy_vercel
            ;;
        "render")
            deploy_render
            ;;
    esac
    
    verify_deployment
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo "Frontend: ${NEXT_PUBLIC_API_URL}"
    echo "Agents: Deployed to Render (check Render dashboard for status)"
}

# Run main function with all arguments
main "$@"