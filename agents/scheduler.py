"""
Agent Scheduler

This module provides CRON-based scheduling for automated job searches.
It manages scheduled executions, handles scheduling configuration, and provides
monitoring capabilities for scheduled tasks.
"""

import asyncio
import logging
import schedule
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from enum import Enum
from dataclasses import dataclass, asdict
import json
from pathlib import Path

from coordinator import AgentCoordinator

logger = logging.getLogger(__name__)

class ScheduleFrequency(Enum):
    """Supported scheduling frequencies."""
    HOURLY = "hourly"
    EVERY_2_HOURS = "every_2_hours"
    EVERY_4_HOURS = "every_4_hours"
    EVERY_6_HOURS = "every_6_hours"
    EVERY_12_HOURS = "every_12_hours"
    DAILY = "daily"
    TWICE_DAILY = "twice_daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"

@dataclass
class ScheduledTask:
    """Represents a scheduled task."""
    task_id: str
    name: str
    frequency: ScheduleFrequency
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    run_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    custom_schedule: Optional[str] = None  # For custom cron expressions
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data['frequency'] = self.frequency.value
        data['last_run'] = self.last_run.isoformat() if self.last_run else None
        data['next_run'] = self.next_run.isoformat() if self.next_run else None
        return data

class AgentScheduler:
    """Manages scheduled execution of job scraping agents."""
    
    def __init__(self, coordinator: AgentCoordinator, config_path: Optional[str] = None):
        """
        Initialize the scheduler.
        
        Args:
            coordinator: Agent coordinator instance
            config_path: Path to scheduler configuration file
        """
        self.coordinator = coordinator
        self.config_path = config_path or "scheduler_config.json"
        self.config = self._load_scheduler_config()
        self.scheduled_tasks: Dict[str, ScheduledTask] = {}
        self.is_running = False
        self.scheduler_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()
        
        # Initialize scheduled tasks
        self._initialize_scheduled_tasks()
        
        logger.info(f"Agent scheduler initialized with {len(self.scheduled_tasks)} tasks")
    
    def _load_scheduler_config(self) -> Dict[str, Any]:
        """Load scheduler configuration from file or create default."""
        config_file = Path(self.config_path)
        
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                logger.info(f"Loaded scheduler configuration from {self.config_path}")
                return config
            except Exception as e:
                logger.error(f"Failed to load scheduler config from {self.config_path}: {e}")
        
        # Return default configuration
        default_config = {
            "enabled": True,
            "timezone": "America/Chicago",  # Nashville timezone
            "tasks": {
                "main_job_search": {
                    "name": "Main Job Search",
                    "frequency": "every_4_hours",
                    "enabled": True,
                    "description": "Primary job search across all enabled sources"
                },
                "quick_check": {
                    "name": "Quick Remote Jobs Check",
                    "frequency": "every_2_hours",
                    "enabled": True,
                    "description": "Quick check of remote job boards only",
                    "agent_filter": ["remote_ok", "weworkremotely"]
                },
                "daily_comprehensive": {
                    "name": "Daily Comprehensive Search",
                    "frequency": "daily",
                    "enabled": True,
                    "description": "Comprehensive daily search with all sources",
                    "schedule_time": "09:00"
                }
            },
            "execution_settings": {
                "max_concurrent_executions": 1,
                "execution_timeout": 3600,  # 1 hour
                "retry_failed_tasks": True,
                "retry_delay": 1800,  # 30 minutes
                "max_retries": 2
            },
            "notifications": {
                "enabled": False,
                "webhook_url": None,
                "notify_on_success": False,
                "notify_on_failure": True,
                "notify_on_jobs_found": True,
                "min_jobs_for_notification": 5
            }
        }
        
        # Save default config
        self._save_scheduler_config(default_config)
        return default_config
    
    def _save_scheduler_config(self, config: Dict[str, Any]) -> None:
        """Save scheduler configuration to file."""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2, default=str)
            logger.info(f"Scheduler configuration saved to {self.config_path}")
        except Exception as e:
            logger.error(f"Failed to save scheduler config to {self.config_path}: {e}")
    
    def _initialize_scheduled_tasks(self) -> None:
        """Initialize scheduled tasks from configuration."""
        tasks_config = self.config.get('tasks', {})
        
        for task_id, task_config in tasks_config.items():
            try:
                frequency_str = task_config.get('frequency', 'daily')
                frequency = ScheduleFrequency(frequency_str)
                
                task = ScheduledTask(
                    task_id=task_id,
                    name=task_config.get('name', task_id),
                    frequency=frequency,
                    enabled=task_config.get('enabled', True),
                    custom_schedule=task_config.get('custom_schedule')
                )
                
                self.scheduled_tasks[task_id] = task
                logger.info(f"Initialized scheduled task: {task.name} ({frequency.value})")
                
            except ValueError as e:
                logger.error(f"Invalid frequency for task {task_id}: {e}")
            except Exception as e:
                logger.error(f"Failed to initialize task {task_id}: {e}")
    
    def add_scheduled_task(self, task_id: str, name: str, frequency: ScheduleFrequency, 
                          enabled: bool = True, custom_schedule: Optional[str] = None) -> bool:
        """
        Add a new scheduled task.
        
        Args:
            task_id: Unique identifier for the task
            name: Human-readable name for the task
            frequency: Scheduling frequency
            enabled: Whether the task is enabled
            custom_schedule: Custom schedule string for CUSTOM frequency
            
        Returns:
            True if task was added successfully
        """
        try:
            if task_id in self.scheduled_tasks:
                logger.warning(f"Task {task_id} already exists")
                return False
            
            task = ScheduledTask(
                task_id=task_id,
                name=name,
                frequency=frequency,
                enabled=enabled,
                custom_schedule=custom_schedule
            )
            
            self.scheduled_tasks[task_id] = task
            
            # Update configuration
            if 'tasks' not in self.config:
                self.config['tasks'] = {}
            
            self.config['tasks'][task_id] = {
                'name': name,
                'frequency': frequency.value,
                'enabled': enabled,
                'custom_schedule': custom_schedule
            }
            
            self._save_scheduler_config(self.config)
            
            # If scheduler is running, add to schedule
            if self.is_running:
                self._schedule_task(task)
            
            logger.info(f"Added scheduled task: {name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add scheduled task {task_id}: {e}")
            return False
    
    def remove_scheduled_task(self, task_id: str) -> bool:
        """
        Remove a scheduled task.
        
        Args:
            task_id: ID of the task to remove
            
        Returns:
            True if task was removed successfully
        """
        try:
            if task_id not in self.scheduled_tasks:
                logger.warning(f"Task {task_id} not found")
                return False
            
            # Remove from schedule
            schedule.clear(task_id)
            
            # Remove from tasks
            del self.scheduled_tasks[task_id]
            
            # Update configuration
            if task_id in self.config.get('tasks', {}):
                del self.config['tasks'][task_id]
                self._save_scheduler_config(self.config)
            
            logger.info(f"Removed scheduled task: {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove scheduled task {task_id}: {e}")
            return False
    
    def enable_task(self, task_id: str) -> bool:
        """Enable a scheduled task."""
        if task_id not in self.scheduled_tasks:
            return False
        
        task = self.scheduled_tasks[task_id]
        task.enabled = True
        
        # Update config
        if task_id in self.config.get('tasks', {}):
            self.config['tasks'][task_id]['enabled'] = True
            self._save_scheduler_config(self.config)
        
        # Re-schedule if scheduler is running
        if self.is_running:
            self._schedule_task(task)
        
        logger.info(f"Enabled scheduled task: {task.name}")
        return True
    
    def disable_task(self, task_id: str) -> bool:
        """Disable a scheduled task."""
        if task_id not in self.scheduled_tasks:
            return False
        
        task = self.scheduled_tasks[task_id]
        task.enabled = False
        
        # Remove from schedule
        schedule.clear(task_id)
        
        # Update config
        if task_id in self.config.get('tasks', {}):
            self.config['tasks'][task_id]['enabled'] = False
            self._save_scheduler_config(self.config)
        
        logger.info(f"Disabled scheduled task: {task.name}")
        return True
    
    def _schedule_task(self, task: ScheduledTask) -> None:
        """Schedule a single task based on its frequency."""
        if not task.enabled:
            return
        
        # Create job function
        def job_wrapper():
            asyncio.create_task(self._execute_scheduled_task(task.task_id))
        
        # Schedule based on frequency
        if task.frequency == ScheduleFrequency.HOURLY:
            schedule.every().hour.do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.EVERY_2_HOURS:
            schedule.every(2).hours.do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.EVERY_4_HOURS:
            schedule.every(4).hours.do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.EVERY_6_HOURS:
            schedule.every(6).hours.do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.EVERY_12_HOURS:
            schedule.every(12).hours.do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.DAILY:
            # Check if specific time is configured
            task_config = self.config.get('tasks', {}).get(task.task_id, {})
            schedule_time = task_config.get('schedule_time', '09:00')
            schedule.every().day.at(schedule_time).do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.TWICE_DAILY:
            schedule.every().day.at("09:00").do(job_wrapper).tag(task.task_id)
            schedule.every().day.at("17:00").do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.WEEKLY:
            schedule.every().monday.at("09:00").do(job_wrapper).tag(task.task_id)
        elif task.frequency == ScheduleFrequency.CUSTOM:
            # Custom scheduling would require additional cron parsing
            logger.warning(f"Custom scheduling not yet implemented for task {task.task_id}")
        
        # Update next run time
        jobs = schedule.get_jobs(task.task_id)
        if jobs:
            task.next_run = jobs[0].next_run
        
        logger.info(f"Scheduled task {task.name} with frequency {task.frequency.value}")
    
    async def _execute_scheduled_task(self, task_id: str) -> None:
        """Execute a scheduled task."""
        if task_id not in self.scheduled_tasks:
            logger.error(f"Scheduled task {task_id} not found")
            return
        
        task = self.scheduled_tasks[task_id]
        
        if not task.enabled:
            logger.info(f"Skipping disabled task: {task.name}")
            return
        
        # Check for concurrent execution limit
        execution_settings = self.config.get('execution_settings', {})
        max_concurrent = execution_settings.get('max_concurrent_executions', 1)
        
        if self.coordinator.status.value == 'running' and max_concurrent <= 1:
            logger.warning(f"Skipping task {task.name} - coordinator is already running")
            return
        
        logger.info(f"Executing scheduled task: {task.name}")
        
        task.last_run = datetime.now()
        task.run_count += 1
        
        try:
            # Get task-specific configuration
            task_config = self.config.get('tasks', {}).get(task_id, {})
            agent_filter = task_config.get('agent_filter')
            
            # Temporarily modify coordinator config if agent filter is specified
            original_config = None
            if agent_filter:
                original_config = self.coordinator.config.copy()
                # Disable agents not in filter
                for agent_name in self.coordinator.config.get('agents', {}):
                    if agent_name not in agent_filter:
                        self.coordinator.config['agents'][agent_name]['enabled'] = False
            
            # Execute the task
            timeout = execution_settings.get('execution_timeout', 3600)
            result = await asyncio.wait_for(
                self.coordinator.run_all_agents(),
                timeout=timeout
            )
            
            # Restore original config if modified
            if original_config:
                self.coordinator.config = original_config
            
            task.success_count += 1
            
            # Send notification if configured
            await self._send_notification(task, result, success=True)
            
            logger.info(f"Scheduled task {task.name} completed successfully: {result.get('total_jobs_found', 0)} jobs found")
            
        except asyncio.TimeoutError:
            task.failure_count += 1
            error_msg = f"Scheduled task {task.name} timed out after {timeout} seconds"
            logger.error(error_msg)
            await self._send_notification(task, {'error': error_msg}, success=False)
            
        except Exception as e:
            task.failure_count += 1
            error_msg = f"Scheduled task {task.name} failed: {str(e)}"
            logger.error(error_msg)
            await self._send_notification(task, {'error': error_msg}, success=False)
            
            # Retry logic
            if execution_settings.get('retry_failed_tasks', True):
                retry_delay = execution_settings.get('retry_delay', 1800)
                max_retries = execution_settings.get('max_retries', 2)
                
                if task.failure_count <= max_retries:
                    logger.info(f"Scheduling retry for task {task.name} in {retry_delay} seconds")
                    
                    def retry_job():
                        asyncio.create_task(self._execute_scheduled_task(task_id))
                    
                    schedule.every(retry_delay).seconds.do(retry_job).tag(f"{task_id}_retry")
        
        # Update next run time
        jobs = schedule.get_jobs(task.task_id)
        if jobs:
            task.next_run = jobs[0].next_run
    
    async def _send_notification(self, task: ScheduledTask, result: Dict[str, Any], success: bool) -> None:
        """Send notification about task execution."""
        notifications_config = self.config.get('notifications', {})
        
        if not notifications_config.get('enabled', False):
            return
        
        # Check notification conditions
        should_notify = False
        
        if success and notifications_config.get('notify_on_success', False):
            should_notify = True
        elif not success and notifications_config.get('notify_on_failure', True):
            should_notify = True
        elif success and notifications_config.get('notify_on_jobs_found', True):
            jobs_found = result.get('total_jobs_found', 0)
            min_jobs = notifications_config.get('min_jobs_for_notification', 5)
            if jobs_found >= min_jobs:
                should_notify = True
        
        if not should_notify:
            return
        
        # Prepare notification payload
        webhook_url = notifications_config.get('webhook_url')
        if not webhook_url:
            logger.warning("Notification enabled but no webhook URL configured")
            return
        
        try:
            import aiohttp
            
            payload = {
                'task_name': task.name,
                'task_id': task.task_id,
                'success': success,
                'timestamp': datetime.now().isoformat(),
                'result': result
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Notification sent for task {task.name}")
                    else:
                        logger.warning(f"Notification failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")
    
    def start_scheduler(self) -> bool:
        """Start the scheduler in a background thread."""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return False
        
        if not self.config.get('enabled', True):
            logger.info("Scheduler is disabled in configuration")
            return False
        
        try:
            # Clear any existing schedules
            schedule.clear()
            
            # Schedule all enabled tasks
            for task in self.scheduled_tasks.values():
                if task.enabled:
                    self._schedule_task(task)
            
            # Start scheduler thread
            self.is_running = True
            self.stop_event.clear()
            self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
            self.scheduler_thread.start()
            
            logger.info(f"Scheduler started with {len([t for t in self.scheduled_tasks.values() if t.enabled])} active tasks")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start scheduler: {str(e)}")
            self.is_running = False
            return False
    
    def stop_scheduler(self) -> bool:
        """Stop the scheduler."""
        if not self.is_running:
            logger.warning("Scheduler is not running")
            return False
        
        try:
            logger.info("Stopping scheduler...")
            
            # Signal stop
            self.stop_event.set()
            self.is_running = False
            
            # Clear all scheduled jobs
            schedule.clear()
            
            # Wait for thread to finish
            if self.scheduler_thread and self.scheduler_thread.is_alive():
                self.scheduler_thread.join(timeout=5)
            
            logger.info("Scheduler stopped")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop scheduler: {str(e)}")
            return False
    
    def _run_scheduler(self) -> None:
        """Main scheduler loop running in background thread."""
        logger.info("Scheduler thread started")
        
        while not self.stop_event.is_set():
            try:
                schedule.run_pending()
                time.sleep(1)
            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
                time.sleep(5)  # Wait before retrying
        
        logger.info("Scheduler thread stopped")
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status."""
        return {
            'is_running': self.is_running,
            'enabled': self.config.get('enabled', True),
            'total_tasks': len(self.scheduled_tasks),
            'enabled_tasks': len([t for t in self.scheduled_tasks.values() if t.enabled]),
            'next_run': min([t.next_run for t in self.scheduled_tasks.values() if t.next_run], default=None),
            'tasks': [task.to_dict() for task in self.scheduled_tasks.values()]
        }
    
    def get_task_history(self, task_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get execution history for tasks."""
        if task_id and task_id in self.scheduled_tasks:
            task = self.scheduled_tasks[task_id]
            return [task.to_dict()]
        
        # Return all tasks sorted by last run
        tasks = sorted(
            self.scheduled_tasks.values(),
            key=lambda x: x.last_run or datetime.min,
            reverse=True
        )
        
        return [task.to_dict() for task in tasks[:limit]]
    
    def update_schedule_config(self, updates: Dict[str, Any]) -> bool:
        """Update scheduler configuration."""
        try:
            # Deep update configuration
            def deep_update(base_dict, update_dict):
                for key, value in update_dict.items():
                    if isinstance(value, dict) and key in base_dict and isinstance(base_dict[key], dict):
                        deep_update(base_dict[key], value)
                    else:
                        base_dict[key] = value
            
            deep_update(self.config, updates)
            self._save_scheduler_config(self.config)
            
            # Reinitialize tasks if task configuration changed
            if 'tasks' in updates:
                self.scheduled_tasks.clear()
                self._initialize_scheduled_tasks()
                
                # Restart scheduler if running
                if self.is_running:
                    self.stop_scheduler()
                    self.start_scheduler()
            
            logger.info("Scheduler configuration updated")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update scheduler configuration: {str(e)}")
            return False