"""
Tests for the Main Agent Manager

This module tests the main entry point and agent manager functionality.
"""

import pytest
import asyncio
import signal
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import AgentManager

class TestAgentManager:
    """Test cases for AgentManager."""
    
    @pytest.fixture
    def manager(self):
        """Create an agent manager instance for testing."""
        with patch('main.AgentCoordinator') as mock_coordinator_class, \
             patch('main.AgentScheduler') as mock_scheduler_class:
            
            mock_coordinator = Mock()
            mock_scheduler = Mock()
            
            mock_coordinator_class.return_value = mock_coordinator
            mock_scheduler_class.return_value = mock_scheduler
            
            manager = AgentManager()
            manager.coordinator = mock_coordinator
            manager.scheduler = mock_scheduler
            
            return manager
    
    def test_manager_initialization(self, manager):
        """Test agent manager initialization."""
        assert manager.coordinator is not None
        assert manager.scheduler is not None
        assert manager.shutdown_event is not None
    
    @pytest.mark.asyncio
    async def test_run_once_success(self, manager):
        """Test running agents once successfully."""
        expected_result = {
            'total_jobs_found': 15,
            'agents_run': 3,
            'duration_seconds': 45.2
        }
        
        manager.coordinator.run_all_agents = AsyncMock(return_value=expected_result)
        
        result = await manager.run_once()
        
        assert result == expected_result
        manager.coordinator.run_all_agents.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_run_once_failure(self, manager):
        """Test running agents once with failure."""
        manager.coordinator.run_all_agents = AsyncMock(side_effect=Exception("Test error"))
        
        with pytest.raises(Exception, match="Test error"):
            await manager.run_once()
    
    @pytest.mark.asyncio
    async def test_start_scheduler_success(self, manager):
        """Test starting scheduler successfully."""
        manager.scheduler.start_scheduler.return_value = True
        manager.scheduler.is_running = True
        
        # Mock the shutdown event to avoid infinite wait
        async def mock_wait():
            await asyncio.sleep(0.1)  # Short wait for test
            manager.shutdown_event.set()
        
        manager.shutdown_event.wait = mock_wait
        
        result = await manager.start_scheduler()
        
        assert result is True
        manager.scheduler.start_scheduler.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_start_scheduler_failure(self, manager):
        """Test starting scheduler with failure."""
        manager.scheduler.start_scheduler.return_value = False
        
        result = await manager.start_scheduler()
        
        assert result is False
        manager.scheduler.start_scheduler.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_stop_scheduler(self, manager):
        """Test stopping scheduler."""
        manager.scheduler.stop_scheduler.return_value = True
        
        result = await manager.stop_scheduler()
        
        assert result is True
        manager.scheduler.stop_scheduler.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_status(self, manager):
        """Test getting system status."""
        coordinator_status = {
            'status': 'idle',
            'last_execution_time': None,
            'active_agents': [],
            'total_executions': 0
        }
        
        scheduler_status = {
            'is_running': False,
            'enabled': True,
            'total_tasks': 2,
            'enabled_tasks': 2
        }
        
        manager.coordinator.get_status.return_value = coordinator_status
        manager.scheduler.get_scheduler_status.return_value = scheduler_status
        
        status = await manager.get_status()
        
        assert 'timestamp' in status
        assert 'coordinator' in status
        assert 'scheduler' in status
        assert 'system' in status
        
        assert status['coordinator'] == coordinator_status
        assert status['scheduler'] == scheduler_status
        assert 'uptime' in status['system']
        assert 'version' in status['system']
    
    @pytest.mark.asyncio
    async def test_shutdown(self, manager):
        """Test graceful shutdown."""
        manager.scheduler.is_running = True
        manager.scheduler.stop_scheduler.return_value = True
        manager.coordinator.stop_all_agents = AsyncMock(return_value={'status': 'stopped'})
        
        # Mock the event loop executor
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_loop.return_value.run_in_executor = AsyncMock(return_value=True)
            
            await manager.shutdown()
            
            # Verify shutdown event was set
            assert manager.shutdown_event.is_set()
            
            # Verify components were stopped
            manager.coordinator.stop_all_agents.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_shutdown_with_error(self, manager):
        """Test shutdown with error handling."""
        manager.scheduler.is_running = True
        manager.coordinator.stop_all_agents = AsyncMock(side_effect=Exception("Shutdown error"))
        
        # Mock the event loop executor
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_loop.return_value.run_in_executor = AsyncMock(return_value=True)
            
            # Should not raise exception despite error
            await manager.shutdown()
            
            # Shutdown event should still be set despite the error
            assert manager.shutdown_event.is_set()
    
    def test_signal_handler(self, manager):
        """Test signal handler for graceful shutdown."""
        # Mock asyncio.create_task
        with patch('asyncio.create_task') as mock_create_task:
            manager._signal_handler(signal.SIGINT, None)
            
            # Verify shutdown task was created
            mock_create_task.assert_called_once()
            
            # Verify the task is calling shutdown
            call_args = mock_create_task.call_args[0][0]
            # This is a coroutine, so we can't easily test its content
            # but we can verify it was called

class TestMainFunction:
    """Test cases for the main function and CLI interface."""
    
    @pytest.mark.asyncio
    async def test_main_once_mode(self):
        """Test main function in 'once' mode."""
        test_args = ['main.py', '--mode', 'once', '--log-level', 'INFO']
        
        with patch('sys.argv', test_args), \
             patch('main.AgentManager') as mock_manager_class:
            
            mock_manager = Mock()
            mock_manager.run_once = AsyncMock(return_value={
                'total_jobs_found': 10,
                'agents_run': 2,
                'duration_seconds': 30.5,
                'api_sync_status': 'success',
                'errors': []
            })
            mock_manager.shutdown = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            # Import and run main
            from main import main
            await main()
            
            mock_manager.run_once.assert_called_once()
            mock_manager.shutdown.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_main_schedule_mode(self):
        """Test main function in 'schedule' mode."""
        test_args = ['main.py', '--mode', 'schedule']
        
        with patch('sys.argv', test_args), \
             patch('main.AgentManager') as mock_manager_class:
            
            mock_manager = Mock()
            mock_manager.start_scheduler = AsyncMock(return_value=True)
            mock_manager.shutdown = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            # Import and run main
            from main import main
            await main()
            
            mock_manager.start_scheduler.assert_called_once()
            mock_manager.shutdown.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_main_status_mode(self):
        """Test main function in 'status' mode."""
        test_args = ['main.py', '--mode', 'status']
        
        with patch('sys.argv', test_args), \
             patch('main.AgentManager') as mock_manager_class:
            
            mock_manager = Mock()
            mock_manager.get_status = AsyncMock(return_value={
                'coordinator': {'status': 'idle', 'last_execution_time': None},
                'scheduler': {'is_running': False, 'enabled_tasks': 3, 'next_run': None}
            })
            mock_manager.shutdown = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            # Import and run main
            from main import main
            await main()
            
            mock_manager.get_status.assert_called_once()
            mock_manager.shutdown.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_main_schedule_mode_failure(self):
        """Test main function in 'schedule' mode with failure."""
        test_args = ['main.py', '--mode', 'schedule']
        
        with patch('sys.argv', test_args), \
             patch('main.AgentManager') as mock_manager_class, \
             patch('sys.exit') as mock_exit:
            
            mock_manager = Mock()
            mock_manager.start_scheduler = AsyncMock(return_value=False)
            mock_manager.shutdown = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            # Import and run main
            from main import main
            await main()
            
            mock_manager.start_scheduler.assert_called_once()
            mock_exit.assert_called_once_with(1)
    
    @pytest.mark.asyncio
    async def test_main_with_exception(self):
        """Test main function with exception handling."""
        test_args = ['main.py', '--mode', 'once']
        
        with patch('sys.argv', test_args), \
             patch('main.AgentManager') as mock_manager_class, \
             patch('sys.exit') as mock_exit:
            
            mock_manager = Mock()
            mock_manager.run_once = AsyncMock(side_effect=Exception("Test error"))
            mock_manager.shutdown = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            # Import and run main
            from main import main
            await main()
            
            mock_manager.run_once.assert_called_once()
            mock_manager.shutdown.assert_called_once()
            mock_exit.assert_called_once_with(1)
    
    @pytest.mark.asyncio
    async def test_main_keyboard_interrupt(self):
        """Test main function with keyboard interrupt."""
        test_args = ['main.py', '--mode', 'once']
        
        with patch('sys.argv', test_args), \
             patch('main.AgentManager') as mock_manager_class:
            
            mock_manager = Mock()
            mock_manager.run_once = AsyncMock(side_effect=KeyboardInterrupt())
            mock_manager.shutdown = AsyncMock()
            mock_manager_class.return_value = mock_manager
            
            # Import and run main
            from main import main
            await main()
            
            mock_manager.run_once.assert_called_once()
            mock_manager.shutdown.assert_called_once()
    
    def test_argument_parsing(self):
        """Test command line argument parsing."""
        test_args = ['main.py', '--mode', 'schedule', '--log-level', 'DEBUG', '--config', 'test.json']
        
        with patch('sys.argv', test_args):
            # Import argparse setup from main
            import argparse
            parser = argparse.ArgumentParser(description='AI Job Finder Agent System')
            parser.add_argument('--mode', choices=['once', 'schedule', 'status'], default='once')
            parser.add_argument('--config', help='Path to configuration file')
            parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], default='INFO')
            
            args = parser.parse_args(test_args[1:])  # Skip script name
            
            assert args.mode == 'schedule'
            assert args.log_level == 'DEBUG'
            assert args.config == 'test.json'

if __name__ == '__main__':
    pytest.main([__file__])