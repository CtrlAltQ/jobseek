"""
Tests for the Agent Coordinator

This module tests the coordination functionality including agent management,
error recovery, retry mechanisms, and status tracking.
"""

import pytest
import asyncio
import json
import tempfile
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from pathlib import Path

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from coordinator import AgentCoordinator, AgentStatus, AgentExecution, AgentConfig

class TestAgentCoordinator:
    """Test cases for AgentCoordinator."""
    
    @pytest.fixture
    def temp_config_file(self):
        """Create a temporary config file for testing."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            config = {
                "agents": {
                    "test_agent": {
                        "enabled": True,
                        "max_retries": 2,
                        "retry_delay": 1,
                        "timeout": 10,
                        "search_params": {"test": "value"}
                    }
                },
                "api": {
                    "base_url": "http://test.com",
                    "api_key": "test_key"
                }
            }
            json.dump(config, f)
            f.flush()
            yield f.name
        os.unlink(f.name)
    
    @pytest.fixture
    def coordinator(self, temp_config_file):
        """Create a coordinator instance for testing."""
        return AgentCoordinator(temp_config_file)
    
    def test_coordinator_initialization(self, coordinator):
        """Test coordinator initialization."""
        assert coordinator.status == AgentStatus.IDLE
        assert coordinator.last_execution_time is None
        assert len(coordinator.executions) == 0
        assert len(coordinator.active_tasks) == 0
    
    def test_config_loading(self, coordinator):
        """Test configuration loading."""
        assert "agents" in coordinator.config
        assert "test_agent" in coordinator.config["agents"]
        assert coordinator.config["agents"]["test_agent"]["enabled"] is True
    
    def test_config_update(self, coordinator):
        """Test configuration updates."""
        updates = {
            "agents": {
                "test_agent": {
                    "enabled": False
                }
            }
        }
        
        coordinator.update_config(updates)
        assert coordinator.config["agents"]["test_agent"]["enabled"] is False
    
    @pytest.mark.asyncio
    async def test_run_all_agents_no_enabled(self, coordinator):
        """Test running agents when none are enabled."""
        # Disable all agents
        coordinator.update_config({
            "agents": {
                "test_agent": {"enabled": False}
            }
        })
        
        result = await coordinator.run_all_agents()
        assert "error" in result
        assert "No enabled agents" in result["error"]
    
    @pytest.mark.asyncio
    async def test_run_agent_with_retry_success(self, coordinator):
        """Test successful agent execution with retry logic."""
        agent_config = AgentConfig(
            enabled=True,
            max_retries=2,
            retry_delay=0.1,
            timeout=5
        )
        
        # Mock the execute_agent method to succeed
        with patch.object(coordinator, '_execute_agent', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = ([], {'status': 'success', 'jobs_found': 0})
            
            jobs, stats = await coordinator._run_agent_with_retry('test_agent', agent_config)
            
            assert jobs == []
            assert stats['status'] == 'success'
            mock_execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_run_agent_with_retry_failure(self, coordinator):
        """Test agent execution failure with retry logic."""
        agent_config = AgentConfig(
            enabled=True,
            max_retries=1,
            retry_delay=0.1,
            timeout=5
        )
        
        # Mock the execute_agent method to always fail
        with patch.object(coordinator, '_execute_agent', new_callable=AsyncMock) as mock_execute:
            mock_execute.side_effect = Exception("Test error")
            
            with pytest.raises(Exception, match="failed after all retry attempts"):
                await coordinator._run_agent_with_retry('test_agent', agent_config)
            
            # Should be called max_retries + 1 times
            assert mock_execute.call_count == 2
    
    @pytest.mark.asyncio
    async def test_run_agent_with_timeout(self, coordinator):
        """Test agent execution timeout."""
        agent_config = AgentConfig(
            enabled=True,
            max_retries=0,
            retry_delay=0.1,
            timeout=0.1  # Very short timeout
        )
        
        # Mock the execute_agent method to take too long
        async def slow_execute(*args, **kwargs):
            await asyncio.sleep(1)  # Longer than timeout
            return [], {}
        
        with patch.object(coordinator, '_execute_agent', side_effect=slow_execute):
            with pytest.raises(Exception, match="failed after all retry attempts"):
                await coordinator._run_agent_with_retry('test_agent', agent_config)
    
    @pytest.mark.asyncio
    async def test_execute_agent(self, coordinator):
        """Test individual agent execution."""
        search_params = {"test": "params"}
        
        # Mock the ScraperOrchestrator
        with patch('coordinator.ScraperOrchestrator') as mock_orchestrator_class:
            mock_orchestrator = Mock()
            mock_orchestrator_class.return_value = mock_orchestrator
            mock_orchestrator.scrape_all_sources = AsyncMock(return_value={
                'jobs': [Mock()],
                'stats': {'test_agent': {'status': 'success', 'jobs_found': 1}}
            })
            
            jobs, stats = await coordinator._execute_agent('test_agent', search_params)
            
            assert len(jobs) == 1
            assert stats['status'] == 'success'
            mock_orchestrator.scrape_all_sources.assert_called_once_with(search_params)
    
    @pytest.mark.asyncio
    async def test_process_jobs_with_ai_disabled(self, coordinator):
        """Test job processing when AI is disabled."""
        coordinator.job_processor = None
        
        jobs = [Mock(), Mock()]
        result = await coordinator._process_jobs_with_ai(jobs)
        
        assert result == jobs  # Should return original jobs unchanged
    
    @pytest.mark.asyncio
    async def test_process_jobs_with_ai_enabled(self, coordinator):
        """Test job processing with AI enabled."""
        # Mock job processor
        mock_processor = Mock()
        
        # Mock enhanced jobs with relevance scores
        enhanced_job1 = Mock()
        enhanced_job1.relevance_score = 0.8  # Above threshold
        enhanced_job2 = Mock()
        enhanced_job2.relevance_score = 0.9  # Above threshold
        
        mock_processor.process_jobs = AsyncMock(return_value=[enhanced_job1, enhanced_job2])
        coordinator.job_processor = mock_processor
        
        # Mock original jobs
        job1 = Mock()
        job2 = Mock()
        jobs = [job1, job2]
        
        # Set AI config
        coordinator.config['ai'] = {
            'relevance_threshold': 70  # 70% threshold
        }
        coordinator.config['user_profile'] = {'test': 'profile'}
        
        result = await coordinator._process_jobs_with_ai(jobs)
        
        # Both jobs should pass the threshold (0.7)
        assert len(result) == 2
        mock_processor.process_jobs.assert_called_once_with(jobs, {'test': 'profile'})
    
    @pytest.mark.asyncio
    async def test_send_results_to_api_success(self, coordinator):
        """Test successful API result sending."""
        jobs = [Mock()]
        jobs[0].to_dict.return_value = {'title': 'Test Job'}
        stats = {'test_agent': {'status': 'success'}}
        
        # Mock aiohttp
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = Mock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value={'success': True})
            
            mock_session.return_value.__aenter__.return_value.post.return_value.__aenter__.return_value = mock_response
            
            result = await coordinator._send_results_to_api(jobs, stats)
            
            assert result['status'] == 'success'
            assert result['jobs_processed'] == 1
    
    @pytest.mark.asyncio
    async def test_send_results_to_api_failure(self, coordinator):
        """Test API result sending failure."""
        jobs = [Mock()]
        jobs[0].to_dict.return_value = {'title': 'Test Job'}
        stats = {'test_agent': {'status': 'success'}}
        
        # Mock aiohttp to return error
        with patch('aiohttp.ClientSession') as mock_session:
            mock_response = Mock()
            mock_response.status = 500
            mock_response.text = AsyncMock(return_value='Server Error')
            
            mock_session.return_value.__aenter__.return_value.post.return_value.__aenter__.return_value = mock_response
            
            result = await coordinator._send_results_to_api(jobs, stats)
            
            assert result['status'] == 'failed'
            assert 'HTTP 500' in result['error']
    
    @pytest.mark.asyncio
    async def test_send_results_to_api_missing_config(self, coordinator):
        """Test API result sending with missing configuration."""
        coordinator.config['api'] = {'base_url': None, 'api_key': None}
        
        result = await coordinator._send_results_to_api([], {})
        
        assert result['status'] == 'skipped'
        assert result['reason'] == 'missing_config'
    
    def test_get_status(self, coordinator):
        """Test status retrieval."""
        status = coordinator.get_status()
        
        assert 'status' in status
        assert 'last_execution_time' in status
        assert 'active_agents' in status
        assert 'total_executions' in status
        assert 'recent_executions' in status
        
        assert status['status'] == 'idle'
        assert status['active_agents'] == []
        assert status['total_executions'] == 0
    
    def test_get_execution_logs(self, coordinator):
        """Test execution log retrieval."""
        # Add some mock executions
        execution1 = AgentExecution(
            execution_id='test1',
            agent_id='agent1',
            source='test_source',
            start_time=datetime.now() - timedelta(hours=1)
        )
        execution2 = AgentExecution(
            execution_id='test2',
            agent_id='agent2',
            source='test_source',
            start_time=datetime.now()
        )
        
        coordinator.executions['test1'] = execution1
        coordinator.executions['test2'] = execution2
        
        logs = coordinator.get_execution_logs(limit=10)
        
        assert len(logs) == 2
        # Should be sorted by start_time descending
        assert logs[0]['execution_id'] == 'test2'
        assert logs[1]['execution_id'] == 'test1'
    
    @pytest.mark.asyncio
    async def test_stop_all_agents(self, coordinator):
        """Test stopping all running agents."""
        # Set coordinator to running state
        coordinator.status = AgentStatus.RUNNING
        
        # Add mock active tasks
        mock_task1 = Mock()
        mock_task1.done.return_value = False
        mock_task1.cancel = Mock()
        
        mock_task2 = Mock()
        mock_task2.done.return_value = True
        mock_task2.cancel = Mock()
        
        coordinator.active_tasks = {
            'agent1': mock_task1,
            'agent2': mock_task2
        }
        
        # Mock asyncio.gather
        with patch('coordinator.asyncio.gather', new_callable=AsyncMock):
            result = await coordinator.stop_all_agents()
        
        assert result['status'] == 'stopped'
        assert result['agents_cancelled'] == 1  # Only one was not done
        assert coordinator.status == AgentStatus.IDLE
        assert len(coordinator.active_tasks) == 0
        
        # Verify cancel was called on the undone task
        mock_task1.cancel.assert_called_once()
        mock_task2.cancel.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_stop_all_agents_not_running(self, coordinator):
        """Test stopping agents when none are running."""
        result = await coordinator.stop_all_agents()
        
        assert result['status'] == 'no_agents_running'

class TestAgentExecution:
    """Test cases for AgentExecution dataclass."""
    
    def test_agent_execution_creation(self):
        """Test AgentExecution creation."""
        execution = AgentExecution(
            execution_id='test_id',
            agent_id='test_agent',
            source='test_source',
            start_time=datetime.now()
        )
        
        assert execution.execution_id == 'test_id'
        assert execution.agent_id == 'test_agent'
        assert execution.source == 'test_source'
        assert execution.status == AgentStatus.RUNNING
        assert execution.errors == []
        assert execution.retry_count == 0
    
    def test_agent_execution_to_dict(self):
        """Test AgentExecution serialization."""
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=5)
        
        execution = AgentExecution(
            execution_id='test_id',
            agent_id='test_agent',
            source='test_source',
            start_time=start_time,
            end_time=end_time,
            status=AgentStatus.COMPLETED,
            jobs_found=10,
            jobs_processed=8,
            errors=['error1', 'error2'],
            retry_count=1
        )
        
        result = execution.to_dict()
        
        assert result['execution_id'] == 'test_id'
        assert result['agent_id'] == 'test_agent'
        assert result['source'] == 'test_source'
        assert result['start_time'] == start_time.isoformat()
        assert result['end_time'] == end_time.isoformat()
        assert result['status'] == 'completed'
        assert result['jobs_found'] == 10
        assert result['jobs_processed'] == 8
        assert result['errors'] == ['error1', 'error2']
        assert result['retry_count'] == 1

class TestAgentConfig:
    """Test cases for AgentConfig dataclass."""
    
    def test_agent_config_defaults(self):
        """Test AgentConfig default values."""
        config = AgentConfig()
        
        assert config.enabled is True
        assert config.max_retries == 3
        assert config.retry_delay == 300
        assert config.timeout == 1800
        assert config.rate_limit == 1.0
        assert config.search_params == {}
    
    def test_agent_config_custom_values(self):
        """Test AgentConfig with custom values."""
        search_params = {'test': 'value'}
        config = AgentConfig(
            enabled=False,
            max_retries=5,
            retry_delay=600,
            timeout=3600,
            rate_limit=0.5,
            search_params=search_params
        )
        
        assert config.enabled is False
        assert config.max_retries == 5
        assert config.retry_delay == 600
        assert config.timeout == 3600
        assert config.rate_limit == 0.5
        assert config.search_params == search_params

if __name__ == '__main__':
    pytest.main([__file__])