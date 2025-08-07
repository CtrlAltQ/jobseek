#!/usr/bin/env python3
"""
AI Job Finder - Main Agent Entry Point

This module provides the main entry point for the AI job finder system,
integrating the coordinator and scheduler for automated job discovery.
"""

import asyncio
import logging
import argparse
import signal
import sys
from datetime import datetime
from pathlib import Path

from coordinator import AgentCoordinator
from scheduler import AgentScheduler
from api_client import create_api_client
from monitoring import create_monitor
from monitoring.sentry_config import initialize_sentry
from config.environments import env_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('agent_logs.log')
    ]
)
logger = logging.getLogger(__name__)

class AgentManager:
    """Main manager for the AI job finder system."""
    
    def __init__(self):
        # Initialize Sentry monitoring first
        initialize_sentry()
        
        self.coordinator = AgentCoordinator()
        self.scheduler = AgentScheduler(self.coordinator)
        self.shutdown_event = asyncio.Event()
        self.config = env_manager.get_config()
        
        # Initialize monitoring
        self.monitor = None
        self._setup_monitoring()
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _setup_monitoring(self):
        """Setup system monitoring."""
        try:
            config = self.coordinator.config
            api_config = config.get('api', {})
            
            if api_config.get('base_url') and api_config.get('api_key'):
                # Create API client for monitoring
                api_client = create_api_client(
                    base_url=api_config['base_url'],
                    api_key=api_config['api_key'],
                    timeout=api_config.get('timeout', 30),
                    max_retries=api_config.get('max_retries', 3)
                )
                
                # Create monitor
                monitor_config = config.get('monitoring', {
                    'alerts': {
                        'response_time_threshold': 10.0,
                        'error_rate_threshold': 0.5
                    },
                    'email': {
                        'enabled': False
                    }
                })
                
                self.monitor = create_monitor(api_client, monitor_config)
                logger.info("System monitoring initialized")
            else:
                logger.warning("API configuration missing, monitoring disabled")
        
        except Exception as e:
            logger.warning(f"Failed to setup monitoring: {str(e)}")
            self.monitor = None
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, initiating shutdown...")
        asyncio.create_task(self.shutdown())
    
    async def run_once(self) -> dict:
        """Run agents once and return results."""
        logger.info("Running agents once...")
        try:
            results = await self.coordinator.run_all_agents()
            logger.info(f"Single execution completed: {results.get('total_jobs_found', 0)} jobs found")
            return results
        except Exception as e:
            logger.error(f"Single execution failed: {str(e)}")
            raise
    
    async def start_scheduler(self) -> bool:
        """Start the scheduler for automated execution."""
        logger.info("Starting scheduler...")
        
        if self.scheduler.start_scheduler():
            logger.info("Scheduler started successfully")
            
            # Start monitoring if available
            if self.monitor:
                await self.monitor.start_monitoring(interval=60)
                logger.info("System monitoring started")
            
            # Keep the main thread alive
            try:
                await self.shutdown_event.wait()
            except KeyboardInterrupt:
                logger.info("Received keyboard interrupt")
            
            return True
        else:
            logger.error("Failed to start scheduler")
            return False
    
    async def stop_scheduler(self) -> bool:
        """Stop the scheduler."""
        logger.info("Stopping scheduler...")
        return self.scheduler.stop_scheduler()
    
    async def get_status(self) -> dict:
        """Get current system status."""
        coordinator_status = self.coordinator.get_status()
        scheduler_status = self.scheduler.get_scheduler_status()
        
        # Get monitoring status if available
        monitoring_status = None
        if self.monitor:
            monitoring_status = self.monitor.get_health_summary()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'coordinator': coordinator_status,
            'scheduler': scheduler_status,
            'monitoring': monitoring_status,
            'system': {
                'uptime': (datetime.now() - datetime.now()).total_seconds(),  # Will be updated with actual start time
                'version': '1.0.0'
            }
        }
    
    async def shutdown(self):
        """Graceful shutdown of the system."""
        logger.info("Shutting down agent manager...")
        
        try:
            # Stop monitoring
            if self.monitor:
                await self.monitor.stop_monitoring()
                logger.info("System monitoring stopped")
            
            # Stop scheduler
            if self.scheduler.is_running:
                await asyncio.get_event_loop().run_in_executor(None, self.scheduler.stop_scheduler)
            
            # Stop any running agents
            await self.coordinator.stop_all_agents()
            
            # Signal shutdown complete
            self.shutdown_event.set()
            
            logger.info("Agent manager shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {str(e)}")

async def main():
    """Main entry point with command line argument parsing."""
    parser = argparse.ArgumentParser(description='AI Job Finder Agent System')
    parser.add_argument('--mode', choices=['once', 'schedule', 'status', 'monitor'], default='once',
                       help='Execution mode: run once, start scheduler, show status, or show monitoring info')
    parser.add_argument('--config', help='Path to configuration file')
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], 
                       default='INFO', help='Logging level')
    
    args = parser.parse_args()
    
    # Set logging level
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    # Initialize manager
    manager = AgentManager()
    
    try:
        if args.mode == 'once':
            # Run agents once
            results = await manager.run_once()
            print(f"\n=== Execution Results ===")
            print(f"Jobs found: {results.get('total_jobs_found', 0)}")
            print(f"Agents run: {results.get('agents_run', 0)}")
            print(f"Duration: {results.get('duration_seconds', 0):.2f} seconds")
            print(f"API sync: {results.get('api_sync_status', 'unknown')}")
            
            if results.get('errors'):
                print(f"Errors: {len(results['errors'])}")
                for error in results['errors']:
                    print(f"  - {error}")
        
        elif args.mode == 'schedule':
            # Start scheduler
            logger.info("Starting in scheduler mode...")
            success = await manager.start_scheduler()
            if not success:
                sys.exit(1)
        
        elif args.mode == 'status':
            # Show status
            status = await manager.get_status()
            print(f"\n=== System Status ===")
            print(f"Coordinator Status: {status['coordinator']['status']}")
            print(f"Scheduler Running: {status['scheduler']['is_running']}")
            print(f"Active Tasks: {status['scheduler']['enabled_tasks']}")
            print(f"Last Execution: {status['coordinator']['last_execution_time'] or 'Never'}")
            
            if status['scheduler']['next_run']:
                print(f"Next Scheduled Run: {status['scheduler']['next_run']}")
        
        elif args.mode == 'monitor':
            # Show monitoring information
            if not manager.monitor:
                print("Monitoring is not configured or available")
                return
            
            health_summary = manager.monitor.get_health_summary()
            active_alerts = manager.monitor.get_active_alerts()
            current_metrics = manager.monitor.get_current_metrics()
            
            print(f"\n=== System Health ===")
            print(f"Overall Status: {health_summary['status']}")
            print(f"API Connectivity: {health_summary['api_connectivity']}")
            print(f"Active Agents: {health_summary['active_agents']}")
            print(f"Error Rate: {health_summary['error_rate']}")
            print(f"Uptime: {health_summary['uptime']}")
            print(f"Response Time: {health_summary['response_time']}")
            print(f"Last Sync: {health_summary['last_sync'] or 'Never'}")
            
            print(f"\n=== Active Alerts ({len(active_alerts)}) ===")
            for alert in active_alerts:
                print(f"[{alert.level.value.upper()}] {alert.title}: {alert.message}")
                print(f"  Component: {alert.component}, Time: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
            
            if current_metrics:
                print(f"\n=== Current Metrics ===")
                print(f"Failed Sync Count: {current_metrics.failed_sync_count}")
                print(f"Total Jobs Synced: {current_metrics.total_jobs_synced}")
                print(f"Average Response Time: {current_metrics.average_response_time:.2f}s")
    
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Application error: {str(e)}")
        sys.exit(1)
    finally:
        await manager.shutdown()

if __name__ == "__main__":
    asyncio.run(main())