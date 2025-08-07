#!/usr/bin/env python3
"""
API Connection Test Script

This script tests the connection between Python agents and the Node.js API,
verifying authentication, job synchronization, and error handling.
"""

import asyncio
import logging
import json
from datetime import datetime
from api_client import create_api_client, ApiClientError, AuthenticationError, NetworkError
from config import NODEJS_API_URL, AGENT_API_KEY

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_api_connection():
    """Test API connection and functionality."""
    
    print("=== AI Job Finder API Connection Test ===\n")
    
    # Check configuration
    if not NODEJS_API_URL or not AGENT_API_KEY:
        print("❌ API configuration missing!")
        print(f"   NODEJS_API_URL: {NODEJS_API_URL or 'Not set'}")
        print(f"   AGENT_API_KEY: {'Set' if AGENT_API_KEY else 'Not set'}")
        return False
    
    print(f"🔧 Configuration:")
    print(f"   API URL: {NODEJS_API_URL}")
    print(f"   API Key: {'*' * (len(AGENT_API_KEY) - 4) + AGENT_API_KEY[-4:] if len(AGENT_API_KEY) > 4 else 'Set'}")
    print()
    
    # Create API client
    client = create_api_client(
        base_url=NODEJS_API_URL,
        api_key=AGENT_API_KEY,
        timeout=10,
        max_retries=2
    )
    
    try:
        async with client:
            # Test 1: Health Check
            print("🏥 Testing API health check...")
            try:
                health_response = await client.health_check()
                if health_response.success:
                    print("   ✅ Health check passed")
                    if health_response.data:
                        print(f"   📊 Database: {health_response.data.get('database', 'unknown')}")
                else:
                    print(f"   ❌ Health check failed: {health_response.error}")
                    return False
            except Exception as e:
                print(f"   ❌ Health check error: {str(e)}")
                return False
            
            print()
            
            # Test 2: Connection Test
            print("🔌 Testing connection...")
            is_connected = await client.test_connection()
            if is_connected:
                print("   ✅ Connection successful")
            else:
                print("   ❌ Connection failed")
                return False
            
            print()
            
            # Test 3: Agent Status
            print("📊 Testing agent status endpoint...")
            try:
                status_response = await client.get_agent_status()
                if status_response.success:
                    print("   ✅ Agent status retrieved")
                    if status_response.data:
                        system_status = status_response.data.get('systemStatus', {})
                        print(f"   🤖 Running agents: {system_status.get('runningAgents', 0)}")
                        print(f"   📈 Overall status: {system_status.get('overallStatus', 'unknown')}")
                else:
                    print(f"   ❌ Agent status failed: {status_response.error}")
            except Exception as e:
                print(f"   ❌ Agent status error: {str(e)}")
            
            print()
            
            # Test 4: Job Synchronization
            print("📋 Testing job synchronization...")
            test_jobs = [
                {
                    "title": "Test Frontend Developer",
                    "company": "Test Company Inc.",
                    "location": "Remote",
                    "salary": {
                        "min": 80000,
                        "max": 120000,
                        "currency": "USD"
                    },
                    "description": "This is a test job posting for API integration testing.",
                    "requirements": ["React", "TypeScript", "Testing"],
                    "benefits": ["Remote work", "Health insurance"],
                    "jobType": "full-time",
                    "remote": True,
                    "source": "api_test",
                    "sourceUrl": f"https://test.example.com/job/{int(datetime.now().timestamp())}",
                    "postedDate": datetime.now().isoformat(),
                    "relevanceScore": 85
                }
            ]
            
            test_stats = {
                "api_test": {
                    "status": "success",
                    "jobs_found": 1,
                    "execution_time": 2.5
                }
            }
            
            try:
                sync_response = await client.sync_jobs(
                    jobs=test_jobs,
                    execution_stats=test_stats,
                    agent_version="test-1.0.0"
                )
                
                if sync_response.success:
                    print("   ✅ Job synchronization successful")
                    data = sync_response.data or {}
                    print(f"   📊 Jobs processed: {data.get('jobsProcessed', 0)}")
                    print(f"   ➕ Jobs inserted: {data.get('jobsInserted', 0)}")
                    print(f"   🔄 Jobs updated: {data.get('jobsUpdated', 0)}")
                    print(f"   📝 Logs created: {data.get('logsCreated', 0)}")
                else:
                    print(f"   ❌ Job synchronization failed: {sync_response.error}")
                    return False
            
            except AuthenticationError as e:
                print(f"   ❌ Authentication error: {str(e)}")
                print("   💡 Check your AGENT_API_KEY configuration")
                return False
            except NetworkError as e:
                print(f"   ❌ Network error: {str(e)}")
                return False
            except Exception as e:
                print(f"   ❌ Sync error: {str(e)}")
                return False
            
            print()
            
            # Test 5: Agent Logs
            print("📜 Testing agent logs endpoint...")
            try:
                logs_response = await client.get_agent_logs(limit=5)
                if logs_response.success:
                    print("   ✅ Agent logs retrieved")
                    data = logs_response.data or {}
                    logs = data.get('logs', [])
                    print(f"   📊 Recent logs: {len(logs)}")
                    
                    if logs:
                        latest_log = logs[0]
                        print(f"   🕐 Latest: {latest_log.get('agentId', 'unknown')} - {latest_log.get('status', 'unknown')}")
                else:
                    print(f"   ❌ Agent logs failed: {logs_response.error}")
            except Exception as e:
                print(f"   ❌ Agent logs error: {str(e)}")
            
            print()
            print("🎉 All tests completed successfully!")
            print("\n💡 Next steps:")
            print("   1. Run agents with: python main.py --mode once")
            print("   2. Start scheduler with: python main.py --mode schedule")
            print("   3. Monitor system with: python main.py --mode monitor")
            
            return True
    
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

async def test_authentication_failure():
    """Test authentication failure handling."""
    print("\n=== Testing Authentication Failure ===")
    
    # Create client with invalid API key
    invalid_client = create_api_client(
        base_url=NODEJS_API_URL,
        api_key="invalid-key",
        timeout=5,
        max_retries=1
    )
    
    try:
        async with invalid_client:
            await invalid_client.sync_jobs([], {})
            print("❌ Authentication test failed - should have raised error")
            return False
    except AuthenticationError:
        print("✅ Authentication failure handled correctly")
        return True
    except Exception as e:
        print(f"❌ Unexpected error in auth test: {str(e)}")
        return False

async def main():
    """Main test function."""
    success = await test_api_connection()
    
    if success:
        auth_success = await test_authentication_failure()
        if auth_success:
            print("\n🎯 All integration tests passed!")
            return 0
    
    print("\n💥 Some tests failed. Check your configuration and API server.")
    return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())