#!/usr/bin/env python3
"""
Demo script to showcase the agent orchestration and scheduling system.

This script demonstrates the key features of the AI Job Finder agent system:
- Agent coordination and management
- Scheduling capabilities
- Error recovery and retry mechanisms
- Status tracking and logging
"""

import asyncio
import logging
import json
from datetime import datetime
from coordinator import AgentCoordinator
from scheduler import AgentScheduler, ScheduleFrequency

# Configure logging for demo
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def demo_coordinator():
    """Demonstrate the agent coordinator functionality."""
    print("\n" + "="*60)
    print("AGENT COORDINATOR DEMO")
    print("="*60)
    
    # Initialize coordinator
    coordinator = AgentCoordinator()
    
    # Show initial status
    print("\n1. Initial Coordinator Status:")
    status = coordinator.get_status()
    print(f"   Status: {status['status']}")
    print(f"   Active Agents: {len(status['active_agents'])}")
    print(f"   Total Executions: {status['total_executions']}")
    
    # Show configuration
    print("\n2. Agent Configuration:")
    for agent_name, config in coordinator.config.get('agents', {}).items():
        enabled = config.get('enabled', False)
        print(f"   {agent_name}: {'✓ Enabled' if enabled else '✗ Disabled'}")
    
    # Update configuration to enable some agents for demo
    print("\n3. Enabling agents for demo...")
    coordinator.update_config({
        'agents': {
            'remote_ok': {'enabled': True},
            'weworkremotely': {'enabled': True}
        }
    })
    
    # Show updated configuration
    print("   Updated agent status:")
    for agent_name, config in coordinator.config.get('agents', {}).items():
        enabled = config.get('enabled', False)
        print(f"   {agent_name}: {'✓ Enabled' if enabled else '✗ Disabled'}")
    
    # Simulate running agents (this would normally scrape job sites)
    print("\n4. Simulating agent execution...")
    print("   Note: This is a demo - actual scraping is disabled")
    print("   In production, this would:")
    print("   - Scrape job sites (Indeed, LinkedIn, RemoteOK, etc.)")
    print("   - Process jobs through AI for relevance scoring")
    print("   - Send results to the Node.js API")
    print("   - Handle errors and retries automatically")
    
    # Show execution logs (empty for demo)
    logs = coordinator.get_execution_logs(limit=5)
    print(f"\n5. Recent Execution Logs: {len(logs)} entries")
    
    return coordinator

async def demo_scheduler(coordinator):
    """Demonstrate the scheduler functionality."""
    print("\n" + "="*60)
    print("AGENT SCHEDULER DEMO")
    print("="*60)
    
    # Initialize scheduler
    scheduler = AgentScheduler(coordinator)
    
    # Show initial scheduler status
    print("\n1. Initial Scheduler Status:")
    status = scheduler.get_scheduler_status()
    print(f"   Running: {status['is_running']}")
    print(f"   Enabled: {status['enabled']}")
    print(f"   Total Tasks: {status['total_tasks']}")
    print(f"   Enabled Tasks: {status['enabled_tasks']}")
    
    # Show scheduled tasks
    print("\n2. Scheduled Tasks:")
    for task in status['tasks']:
        enabled = "✓" if task['enabled'] else "✗"
        print(f"   {enabled} {task['name']} ({task['frequency']})")
        print(f"     Run Count: {task['run_count']}")
        print(f"     Success/Failure: {task['success_count']}/{task['failure_count']}")
    
    # Add a custom task for demo
    print("\n3. Adding custom demo task...")
    success = scheduler.add_scheduled_task(
        task_id='demo_task',
        name='Demo Task - Every 30 seconds',
        frequency=ScheduleFrequency.CUSTOM,
        enabled=True,
        custom_schedule='*/30 * * * * *'  # Every 30 seconds (not implemented in demo)
    )
    
    if success:
        print("   ✓ Demo task added successfully")
    else:
        print("   ✗ Failed to add demo task")
    
    # Show updated task list
    updated_status = scheduler.get_scheduler_status()
    print(f"\n4. Updated Task Count: {updated_status['total_tasks']}")
    
    # Demonstrate task management
    print("\n5. Task Management Demo:")
    print("   - Tasks can be enabled/disabled dynamically")
    print("   - Schedules can be updated without restart")
    print("   - Failed tasks are automatically retried")
    print("   - Execution history is tracked")
    
    return scheduler

async def demo_error_recovery():
    """Demonstrate error recovery and retry mechanisms."""
    print("\n" + "="*60)
    print("ERROR RECOVERY & RETRY DEMO")
    print("="*60)
    
    print("\n1. Error Recovery Features:")
    print("   ✓ Automatic retry on agent failures")
    print("   ✓ Configurable retry delays and limits")
    print("   ✓ Timeout handling for stuck agents")
    print("   ✓ Graceful degradation when agents fail")
    print("   ✓ Detailed error logging and tracking")
    
    print("\n2. Retry Configuration:")
    print("   - Max retries: 3 attempts per agent")
    print("   - Retry delay: 5 minutes between attempts")
    print("   - Timeout: 30 minutes per agent execution")
    print("   - Failed agents don't block other agents")
    
    print("\n3. Monitoring & Alerts:")
    print("   - Real-time status tracking")
    print("   - Execution history with timestamps")
    print("   - Optional webhook notifications")
    print("   - Performance metrics collection")

async def demo_configuration():
    """Demonstrate configuration management."""
    print("\n" + "="*60)
    print("CONFIGURATION MANAGEMENT DEMO")
    print("="*60)
    
    # Show configuration structure
    coordinator = AgentCoordinator()
    
    print("\n1. Configuration Structure:")
    config_keys = list(coordinator.config.keys())
    for key in config_keys:
        print(f"   - {key}")
    
    print("\n2. Agent-Specific Settings:")
    print("   Each agent can be configured with:")
    print("   - Enable/disable status")
    print("   - Retry limits and delays")
    print("   - Timeout values")
    print("   - Rate limiting")
    print("   - Search parameters")
    
    print("\n3. Search Parameters Example:")
    agent_config = coordinator.config.get('agents', {}).get('indeed', {})
    search_params = agent_config.get('search_params', {})
    
    print("   Indeed Agent Configuration:")
    for key, value in search_params.items():
        if isinstance(value, list):
            print(f"   - {key}: {', '.join(value[:3])}{'...' if len(value) > 3 else ''}")
        else:
            print(f"   - {key}: {value}")
    
    print("\n4. Dynamic Configuration Updates:")
    print("   - Configuration can be updated at runtime")
    print("   - Changes are persisted to disk")
    print("   - Scheduler automatically restarts with new config")
    print("   - No system downtime required")

async def main():
    """Run the complete orchestration demo."""
    print("AI JOB FINDER - AGENT ORCHESTRATION DEMO")
    print("=" * 80)
    print("This demo showcases the agent orchestration and scheduling system")
    print("without actually scraping job sites or making external API calls.")
    print("=" * 80)
    
    try:
        # Demo coordinator
        coordinator = await demo_coordinator()
        
        # Demo scheduler
        scheduler = await demo_scheduler(coordinator)
        
        # Demo error recovery
        await demo_error_recovery()
        
        # Demo configuration
        await demo_configuration()
        
        print("\n" + "="*60)
        print("DEMO SUMMARY")
        print("="*60)
        print("\n✓ Agent Coordinator: Manages multiple scraping agents")
        print("✓ Scheduler: CRON-based automated execution")
        print("✓ Error Recovery: Automatic retries and timeout handling")
        print("✓ Configuration: Dynamic updates and persistence")
        print("✓ Monitoring: Status tracking and execution logs")
        print("✓ Integration: API sync and notification support")
        
        print("\nTo run the system in production:")
        print("1. Configure API keys in .env file")
        print("2. Enable desired job sources in agent_config.json")
        print("3. Run: python3 main.py --mode schedule")
        print("4. Monitor via: python3 main.py --mode status")
        
        print("\n" + "="*60)
        print("DEMO COMPLETE")
        print("="*60)
        
    except Exception as e:
        logger.error(f"Demo failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())