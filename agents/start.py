#!/usr/bin/env python3
"""
Render deployment entry point for AI Job Finder agents.
This script runs the job scraping agents on a schedule.
"""

import os
import sys
import asyncio
import logging
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def main():
    """Main entry point for Render deployment."""
    logger.info("Starting AI Job Finder agents on Render...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
    logger.info(f"API Base URL: {os.getenv('API_BASE_URL', 'not set')}")
    
    # Check required environment variables
    required_vars = ['MONGODB_URI', 'OPENAI_API_KEY', 'API_BASE_URL', 'AGENT_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    try:
        # Import and run the main coordinator
        from coordinator import AgentCoordinator
        from api_client import create_api_client
        
        # Create API client
        api_client = create_api_client(
            base_url=os.getenv('API_BASE_URL'),
            api_key=os.getenv('AGENT_API_KEY')
        )
        
        # Create and run coordinator
        coordinator = AgentCoordinator(api_client=api_client)
        
        logger.info("Running job scraping cycle...")
        asyncio.run(coordinator.run_all_agents())
        
        logger.info("Job scraping cycle completed successfully")
        
    except Exception as e:
        logger.error(f"Error running agents: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()