#!/usr/bin/env python3
"""
Health check script for AI Job Finder agents.
"""

import os
import sys
import json
import requests
from datetime import datetime

def check_environment():
    """Check if all required environment variables are set."""
    required_vars = [
        'MONGODB_URI',
        'OPENAI_API_KEY', 
        'API_BASE_URL',
        'AGENT_API_KEY'
    ]
    
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    return {
        'status': 'ok' if not missing else 'error',
        'missing_vars': missing,
        'environment': os.getenv('ENVIRONMENT', 'unknown')
    }

def check_api_connection():
    """Check if we can connect to the API."""
    try:
        api_url = os.getenv('API_BASE_URL')
        if not api_url:
            return {'status': 'error', 'message': 'API_BASE_URL not set'}
        
        # Try to connect to health endpoint
        response = requests.get(f"{api_url}/health", timeout=10)
        
        return {
            'status': 'ok' if response.status_code == 200 else 'error',
            'status_code': response.status_code,
            'api_url': api_url
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }

def main():
    """Run health checks."""
    health_data = {
        'timestamp': datetime.utcnow().isoformat(),
        'environment_check': check_environment(),
        'api_connection_check': check_api_connection()
    }
    
    # Check if --json flag is provided
    if '--json' in sys.argv:
        print(json.dumps(health_data, indent=2))
    else:
        print("AI Job Finder Agents - Health Check")
        print("=" * 40)
        print(f"Timestamp: {health_data['timestamp']}")
        print(f"Environment: {health_data['environment_check']['environment']}")
        
        env_check = health_data['environment_check']
        if env_check['status'] == 'ok':
            print("✅ Environment variables: OK")
        else:
            print(f"❌ Environment variables: Missing {env_check['missing_vars']}")
        
        api_check = health_data['api_connection_check']
        if api_check['status'] == 'ok':
            print("✅ API connection: OK")
        else:
            print(f"❌ API connection: {api_check.get('message', 'Failed')}")
    
    # Exit with error code if any checks failed
    overall_status = all([
        health_data['environment_check']['status'] == 'ok',
        health_data['api_connection_check']['status'] == 'ok'
    ])
    
    sys.exit(0 if overall_status else 1)

if __name__ == "__main__":
    main()