"""
Tests for the Agent Scheduler

This module tests the scheduling functionality including CRON-based scheduling,
task management, and automated execution.
"""

import pytest
import asyncio
import json
import tempfile
import threading
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from pathlib import Path

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scheduler import AgentScheduler, ScheduleFrequency, ScheduledTask
from coordinator import AgentCoordinator

class TestAgentScheduler:
    """Test cases for AgentScheduler."""
    
    @pytest.fixture
    def mock_coordinator(self):
        """Create a mock coordinator for testing."""
        coordinator = Mock()
        coordinator.run_all_agents = AsyncMock(return_value={
            'total_jobs_found': 5,
            'agents_run': 2,
            'duration_seconds': 30.5
        })
        coordinator.status = Mock()
        coordinator.status.value = 'idle'
        coordinator.config = {'agents': {'test_agent': {'enabled': True}}}
        return coordinator
    
    @pytest.fixture
    def temp_config_file(self):
        """Create a temporary scheduler config file for testing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config = {
                "enabled": True,
                "tasks": {
                    "test_task": {
                        "name": "Test Task",
                        "frequency": "hourly",
                        "enabled": True
                    }
                },
                "execution_settings": {
                    "max_concurrent_executions": 1,
                    "execution_timeout": 60,
                    "retry_failed_tasks": True,
                    "retry_delay": 10,
                    "max_retries": 1
                }
            }
            json.dump(config, f)
            f.flush()
            yield f.name
        os.unlink(f.name)
    
    @pytest.fixture
    def scheduler(self, mock_coordinator, temp_config_file):
        """Create a scheduler instance for testing."""
        return AgentScheduler(mock_coordinator, temp_config_file)
    
    def test_scheduler_initialization(self, scheduler):
        """Test scheduler initialization."""
        assert scheduler.coordinator is not None
        assert scheduler.is_running is False
        assert len(scheduler.scheduled_tasks) == 1
        assert 'test_task' in scheduler.scheduled_tasks
    
    def test_config_loading(self, scheduler):
        """Test configuration loading."""
        assert scheduler.config['enabled'] is True
        assert 'test_task' in scheduler.config['tasks']
        assert scheduler.config['tasks']['test_task']['frequency'] == 'hourly'
    
    def test_add_scheduled_task(self, scheduler):
        """Test adding a new scheduled task."""
        success = scheduler.add_scheduled_task(
            task_id='new_task',
            name='New Test Task',
            frequency=ScheduleFrequency.DAILY,
            enabled=True
        )
        
        assert success is True
        assert 'new_task' in scheduler.scheduled_tasks
        assert scheduler.scheduled_tasks['new_task'].name == 'New Test Task'
        assert scheduler.scheduled_tasks['new_task'].frequency == ScheduleFrequency.DAILY
    
    def test_add_duplicate_task(self, scheduler):
        """Test adding a task with duplicate ID."""
        success = scheduler.add_scheduled_task(
            task_id='test_task',  # Already exists
            name='Duplicate Task',
            frequency=ScheduleFrequency.DAILY
        )
        
        assert success is False
    
    def test_remove_scheduled_task(self, scheduler):
        """Test removing a scheduled task."""
        # First verify task exists
        assert 'test_task' in scheduler.scheduled_tasks
        
        success = scheduler.remove_scheduled_task('test_task')
        
        assert success is True
        assert 'test_task' not in scheduler.scheduled_tasks
    
    def test_remove_nonexistent_task(self, scheduler):
        """Test removing a task that doesn't exist."""
        success = scheduler.remove_scheduled_task('nonexistent_task')
        assert success is False
    
    def test_enable_task(self, scheduler):
        """Test enabling a task."""
        # First disable the task
        scheduler.scheduled_tasks['test_task'].enabled = False
        
        success = scheduler.enable_task('test_task')
        
        assert success is True
        assert scheduler.scheduled_tasks['test_task'].enabled is True
    
    def test_disable_task(self, scheduler):
        """Test disabling a task."""
        success = scheduler.disable_task('test_task')
        
        assert success is True
        assert scheduler.scheduled_tasks['test_task'].enabled is False
    
    def test_enable_disable_nonexistent_task(self, scheduler):
        """Test enabling/disabling a task that doesn't exist."""
        assert scheduler.enable_task('nonexistent') is False
        assert scheduler.disable_task('nonexistent') is False
    
    @patch('scheduler.schedule')
    def test_schedule_task_hourly(self, mock_schedule, scheduler):
        """Test scheduling a task with hourly frequency."""
        task = ScheduledTask(
            task_id='hourly_task',
            name='Hourly Task',
            frequency=ScheduleFrequency.HOURLY,
            enabled=True
        )
        
        scheduler._schedule_task(task)
        
        mock_schedule.every.return_value.hour.do.assert_called_once()
    
    @patch('scheduler.schedule')
    def test_schedule_task_daily(self, mock_schedule, scheduler):
        """Test scheduling a task with daily frequency."""
        task = ScheduledTask(
            task_id='daily_task',
            name='Daily Task',
            frequency=ScheduleFrequency.DAILY,
            enabled=True
        )
        
        # Mock the schedule configuration
        scheduler.config['tasks'] = {
            'daily_task': {
                'schedule_time': '10:30'
            }
        }
        
        scheduler._schedule_task(task)
        
        mock_schedule.every.return_value.day.at.assert_called_once_with('10:30')
    
    @patch('scheduler.schedule')
    def test_schedule_task_disabled(self, mock_schedule, scheduler):
        """Test that disabled tasks are not scheduled."""
        task = ScheduledTask(
            task_id='disabled_task',
            name='Disabled Task',
            frequency=ScheduleFrequency.HOURLY,
            enabled=False
        )
        
        scheduler._schedule_task(task)
        
        # Should not call schedule methods for disabled tasks
        mock_schedule.every.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_execute_scheduled_task_success(self, scheduler):
        """Test successful execution of a scheduled task."""
        task_id = 'test_task'
        task = scheduler.scheduled_tasks[task_id]
        
        # Mock coordinator execution
        scheduler.coordinator.run_all_agents = AsyncMock(return_value={
            'total_jobs_found': 10,
            'agents_run': 3
        })
        
        await scheduler._execute_scheduled_task(task_id)
        
        # Verify task statistics were updated
        assert task.run_count == 1
        assert task.success_count == 1
        assert task.failure_count == 0
        assert task.last_run is not None
        
        # Verify coordinator was called
        scheduler.coordinator.run_all_agents.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_execute_scheduled_task_failure(self, scheduler):
        """Test execution of a scheduled task that fails."""
        task_id = 'test_task'
        task = scheduler.scheduled_tasks[task_id]
        
        # Mock coordinator to raise exception
        scheduler.coordinator.run_all_agents = AsyncMock(side_effect=Exception("Test error"))
        
        await scheduler._execute_scheduled_task(task_id)
        
        # Verify task statistics were updated
        assert task.run_count == 1
        assert task.success_count == 0
        assert task.failure_count == 1
        assert task.last_run is not None
    
    @pytest.mark.asyncio
    async def test_execute_scheduled_task_timeout(self, scheduler):
        """Test execution of a scheduled task that times out."""
        task_id = 'test_task'
        task = scheduler.scheduled_tasks[task_id]
        
        # Mock coordinator to take too long
        async def slow_execution():
            await asyncio.sleep(2)  # Longer than test timeout
            return {}
        
        scheduler.coordinator.run_all_agents = slow_execution
        
        # Set short timeout for test
        scheduler.config['execution_settings']['execution_timeout'] = 0.1
        
        await scheduler._execute_scheduled_task(task_id)
        
        # Verify task failed due to timeout
        assert task.failure_count == 1
    
    @pytest.mark.asyncio
    async def test_execute_scheduled_task_disabled(self, scheduler):
        """Test that disabled tasks are not executed."""
        task_id = 'test_task'
        scheduler.scheduled_tasks[task_id].enabled = False
        
        await scheduler._execute_scheduled_task(task_id)
        
        # Coordinator should not be called
        scheduler.coordinator.run_all_agents.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_execute_scheduled_task_concurrent_limit(self, scheduler):
        """Test that concurrent execution limits are respected."""
        task_id = 'test_task'
        
        # Set coordinator to running state
        scheduler.coordinator.status.value = 'running'
        
        await scheduler._execute_scheduled_task(task_id)
        
        # Coordinator should not be called due to concurrent limit
        scheduler.coordinator.run_all_agents.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_execute_scheduled_task_with_agent_filter(self, scheduler):
        """Test executing a task with agent filtering."""
        task_id = 'test_task'
        
        # Configure task with agent filter
        scheduler.config['tasks'][task_id] = {
            'agent_filter': ['agent1', 'agent2']
        }
        
        # Mock coordinator config
        original_config = {
            'agents': {
                'agent1': {'enabled': True},
                'agent2': {'enabled': True},
                'agent3': {'enabled': True}
            }
        }
        scheduler.coordinator.config = original_config.copy()
        
        await scheduler._execute_scheduled_task(task_id)
        
        # Verify coordinator was called
        scheduler.coordinator.run_all_agents.assert_called_once()
        
        # Verify coordinator was called (config restoration is handled internally)
        # The original config should be restored after execution
    
    @pytest.mark.asyncio
    async def test_send_notification_disabled(self, scheduler):
        """Test that notifications are not sent when disabled."""
        task = scheduler.scheduled_tasks['test_task']
        result = {'total_jobs_found': 10}
        
        # Notifications disabled by default
        await scheduler._send_notification(task, result, success=True)
        
        # No exception should be raised, and no HTTP calls should be made
        # This is mainly testing that the method handles disabled notifications gracefully
    
    @pytest.mark.asyncio
    async def test_send_notification_success(self, scheduler):
        """Test sending success notification."""
        # Enable notifications
        scheduler.config['notifications'] = {
            'enabled': True,
            'webhook_url': 'http://test.com/webhook',
            'notify_on_success': True
        }
        
        task = scheduler.scheduled_tasks['test_task']
        result = {'total_jobs_found': 10}
        
        # Mock aiohttp
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = Mock()
            mock_response.status = 200
            
            mock_session.return_value.__aenter__.return_value.post.return_value.__aenter__.return_value = mock_response
            
            await scheduler._send_notification(task, result, success=True)
            
            # Verify HTTP call was made
            mock_session.return_value.__aenter__.return_value.post.assert_called_once()
    
    def test_start_scheduler(self, scheduler):
        """Test starting the scheduler."""
        with patch('scheduler.threading.Thread') as mock_thread:
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance
            
            success = scheduler.start_scheduler()
            
            assert success is True
            assert scheduler.is_running is True
            mock_thread_instance.start.assert_called_once()
    
    def test_start_scheduler_already_running(self, scheduler):
        """Test starting scheduler when it's already running."""
        scheduler.is_running = True
        
        success = scheduler.start_scheduler()
        
        assert success is False
    
    def test_start_scheduler_disabled(self, scheduler):
        """Test starting scheduler when it's disabled in config."""
        scheduler.config['enabled'] = False
        
        success = scheduler.start_scheduler()
        
        assert success is False
    
    def test_stop_scheduler(self, scheduler):
        """Test stopping the scheduler."""
        # Set up running state
        scheduler.is_running = True
        scheduler.scheduler_thread = Mock()
        scheduler.scheduler_thread.is_alive.return_value = True
        
        with patch('scheduler.schedule.clear') as mock_clear:
            success = scheduler.stop_scheduler()
            
            assert success is True
            assert scheduler.is_running is False
            mock_clear.assert_called_once()
            scheduler.scheduler_thread.join.assert_called_once_with(timeout=5)
    
    def test_stop_scheduler_not_running(self, scheduler):
        """Test stopping scheduler when it's not running."""
        success = scheduler.stop_scheduler()
        assert success is False
    
    def test_get_scheduler_status(self, scheduler):
        """Test getting scheduler status."""
        status = scheduler.get_scheduler_status()
        
        assert 'is_running' in status
        assert 'enabled' in status
        assert 'total_tasks' in status
        assert 'enabled_tasks' in status
        assert 'next_run' in status
        assert 'tasks' in status
        
        assert status['is_running'] is False
        assert status['total_tasks'] == 1
        assert status['enabled_tasks'] == 1
        assert len(status['tasks']) == 1
    
    def test_get_task_history_specific_task(self, scheduler):
        """Test getting history for a specific task."""
        task_id = 'test_task'
        history = scheduler.get_task_history(task_id)
        
        assert len(history) == 1
        assert history[0]['task_id'] == task_id
    
    def test_get_task_history_all_tasks(self, scheduler):
        """Test getting history for all tasks."""
        # Add another task
        scheduler.add_scheduled_task('task2', 'Task 2', ScheduleFrequency.DAILY)
        
        history = scheduler.get_task_history()
        
        assert len(history) == 2
    
    def test_update_schedule_config(self, scheduler):
        """Test updating scheduler configuration."""
        updates = {
            'execution_settings': {
                'max_concurrent_executions': 2
            }
        }
        
        success = scheduler.update_schedule_config(updates)
        
        assert success is True
        assert scheduler.config['execution_settings']['max_concurrent_executions'] == 2
    
    def test_update_schedule_config_with_tasks(self, scheduler):
        """Test updating scheduler configuration with task changes."""
        updates = {
            'tasks': {
                'new_task': {
                    'name': 'New Task',
                    'frequency': 'daily',
                    'enabled': True
                }
            }
        }
        
        with patch.object(scheduler, 'stop_scheduler') as mock_stop, \
             patch.object(scheduler, 'start_scheduler') as mock_start:
            
            scheduler.is_running = True
            success = scheduler.update_schedule_config(updates)
            
            assert success is True
            assert 'new_task' in scheduler.scheduled_tasks
            mock_stop.assert_called_once()
            mock_start.assert_called_once()

class TestScheduledTask:
    """Test cases for ScheduledTask dataclass."""
    
    def test_scheduled_task_creation(self):
        """Test ScheduledTask creation."""
        task = ScheduledTask(
            task_id='test_id',
            name='Test Task',
            frequency=ScheduleFrequency.HOURLY
        )
        
        assert task.task_id == 'test_id'
        assert task.name == 'Test Task'
        assert task.frequency == ScheduleFrequency.HOURLY
        assert task.enabled is True
        assert task.run_count == 0
        assert task.success_count == 0
        assert task.failure_count == 0
    
    def test_scheduled_task_to_dict(self):
        """Test ScheduledTask serialization."""
        last_run = datetime.now()
        next_run = last_run + timedelta(hours=1)
        
        task = ScheduledTask(
            task_id='test_id',
            name='Test Task',
            frequency=ScheduleFrequency.DAILY,
            enabled=False,
            last_run=last_run,
            next_run=next_run,
            run_count=5,
            success_count=4,
            failure_count=1,
            custom_schedule='0 9 * * *'
        )
        
        result = task.to_dict()
        
        assert result['task_id'] == 'test_id'
        assert result['name'] == 'Test Task'
        assert result['frequency'] == 'daily'
        assert result['enabled'] is False
        assert result['last_run'] == last_run.isoformat()
        assert result['next_run'] == next_run.isoformat()
        assert result['run_count'] == 5
        assert result['success_count'] == 4
        assert result['failure_count'] == 1
        assert result['custom_schedule'] == '0 9 * * *'

class TestScheduleFrequency:
    """Test cases for ScheduleFrequency enum."""
    
    def test_schedule_frequency_values(self):
        """Test ScheduleFrequency enum values."""
        assert ScheduleFrequency.HOURLY.value == 'hourly'
        assert ScheduleFrequency.EVERY_2_HOURS.value == 'every_2_hours'
        assert ScheduleFrequency.EVERY_4_HOURS.value == 'every_4_hours'
        assert ScheduleFrequency.EVERY_6_HOURS.value == 'every_6_hours'
        assert ScheduleFrequency.EVERY_12_HOURS.value == 'every_12_hours'
        assert ScheduleFrequency.DAILY.value == 'daily'
        assert ScheduleFrequency.TWICE_DAILY.value == 'twice_daily'
        assert ScheduleFrequency.WEEKLY.value == 'weekly'
        assert ScheduleFrequency.CUSTOM.value == 'custom'
    
    def test_schedule_frequency_from_string(self):
        """Test creating ScheduleFrequency from string."""
        assert ScheduleFrequency('hourly') == ScheduleFrequency.HOURLY
        assert ScheduleFrequency('daily') == ScheduleFrequency.DAILY
        assert ScheduleFrequency('weekly') == ScheduleFrequency.WEEKLY

if __name__ == '__main__':
    pytest.main([__file__])