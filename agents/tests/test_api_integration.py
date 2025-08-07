"""
Integration Tests for Agent-API Data Flow

This module contains comprehensive integration tests for the communication
between Python agents and the Node.js API, including job synchronization,
error handling, and monitoring.
"""

import pytest
import asyncio
import json
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, List, Any

# Import modules to test
from api_client import NodeApiClient, create_api_client, ApiClientError, AuthenticationError, NetworkError
from monitoring import SystemMonitor, create_monitor, AlertLevel, HealthStatus
from coordinator import AgentCoordinator

class TestApiClient:
    """Test cases for the API client."""
    
    @pytest.fixture
    def api_client(self):
        """Create a test API client."""
        return create_api_client(
            base_url="http://localhost:3000/api",
            api_key="test-api-key",
            timeout=5,
            max_retries=2
        )
    
    @pytest.fixture
    def sample_jobs(self):
        """Sample job data for testing."""
        return [
            {
                "title": "Frontend Developer",
                "company": "Test Company",
                "location": "Remote",
                "salary": {"min": 80000, "max": 120000, "currency": "USD"},
                "description": "Looking for a skilled frontend developer...",
                "requirements": ["React", "TypeScript", "3+ years experience"],
                "benefits": ["Health insurance", "Remote work"],
                "jobType": "full-time",
                "remote": True,
                "source": "indeed",
                "sourceUrl": "https://indeed.com/job/123",
                "postedDate": datetime.now().isoformat(),
                "relevanceScore": 85
            },
            {
                "title": "Full Stack Engineer",
                "company": "Another Company",
                "location": "Nashville, TN",
                "salary": {"min": 90000, "max": 130000, "currency": "USD"},
                "description": "Full stack engineer position...",
                "requirements": ["Node.js", "React", "MongoDB"],
                "benefits": ["401k", "Flexible hours"],
                "jobType": "full-time",
                "remote": False,
                "source": "linkedin",
                "sourceUrl": "https://linkedin.com/job/456",
                "postedDate": datetime.now().isoformat(),
                "relevanceScore": 92
            }
        ]
    
    @pytest.fixture
    def sample_execution_stats(self):
        """Sample execution statistics."""
        return {
            "indeed": {
                "status": "success",
                "jobs_found": 1,
                "execution_time": 45.2
            },
            "linkedin": {
                "status": "success", 
                "jobs_found": 1,
                "execution_time": 38.7
            }
        }
    
    @pytest.mark.asyncio
    async def test_api_client_initialization(self):
        """Test API client initialization."""
        client = create_api_client("http://test.com", "test-key")
        assert client.base_url == "http://test.com"
        assert client.api_key == "test-key"
        assert client.max_retries == 3  # default
        
        # Test with custom parameters
        client2 = create_api_client(
            "http://test.com", 
            "test-key", 
            timeout=10, 
            max_retries=5
        )
        assert client2.max_retries == 5
    
    @pytest.mark.asyncio
    async def test_api_client_context_manager(self, api_client):
        """Test API client as context manager."""
        async with api_client as client:
            assert client.session is not None
            assert not client.session.closed
        
        # Session should be closed after context
        assert api_client.session is None or api_client.session.closed
    
    @pytest.mark.asyncio
    async def test_sync_jobs_success(self, api_client, sample_jobs, sample_execution_stats):
        """Test successful job synchronization."""
        mock_response_data = {
            "success": True,
            "data": {
                "jobsProcessed": 2,
                "jobsInserted": 2,
                "jobsUpdated": 0,
                "logsCreated": 2
            }
        }
        
        with patch('aiohttp.ClientSession.request') as mock_request:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text = AsyncMock(return_value=json.dumps(mock_response_data))
            mock_request.return_value.__aenter__.return_value = mock_response
            
            async with api_client:
                response = await api_client.sync_jobs(
                    jobs=sample_jobs,
                    execution_stats=sample_execution_stats
                )
            
            assert response.success is True
            assert response.data["jobsProcessed"] == 2
            assert response.data["jobsInserted"] == 2
    
    @pytest.mark.asyncio
    async def test_sync_jobs_authentication_error(self, sample_jobs, sample_execution_stats):
        """Test authentication error handling."""
        client = create_api_client("http://localhost:3000/api", "invalid-key")
        
        mock_response_data = {
            "success": False,
            "error": "Unauthorized"
        }
        
        with patch('aiohttp.ClientSession.request') as mock_request:
            mock_response = AsyncMock()
            mock_response.status = 401
            mock_response.text = AsyncMock(return_value=json.dumps(mock_response_data))
            mock_request.return_value.__aenter__.return_value = mock_response
            
            async with client:
                with pytest.raises(AuthenticationError):
                    await client.sync_jobs(
                        jobs=sample_jobs,
                        execution_stats=sample_execution_stats
                    )
    
    @pytest.mark.asyncio
    async def test_sync_jobs_network_error(self, api_client, sample_jobs, sample_execution_stats):
        """Test network error handling with retries."""
        with patch('aiohttp.ClientSession.request') as mock_request:
            # Simulate network error
            mock_request.side_effect = asyncio.TimeoutError("Connection timeout")
            
            async with api_client:
                with pytest.raises(NetworkError):
                    await api_client.sync_jobs(
                        jobs=sample_jobs,
                        execution_stats=sample_execution_stats
                    )
            
            # Should have retried max_retries + 1 times
            assert mock_request.call_count == api_client.max_retries + 1
    
    @pytest.mark.asyncio
    async def test_get_agent_status(self, api_client):
        """Test getting agent status."""
        mock_response_data = {
            "success": True,
            "data": {
                "systemStatus": {
                    "runningAgents": 2,
                    "totalAgents": 4,
                    "lastActivity": datetime.now().isoformat(),
                    "overallStatus": "active"
                },
                "agentStatuses": [],
                "recentActivity": []
            }
        }
        
        with patch('aiohttp.ClientSession.request') as mock_request:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text = AsyncMock(return_value=json.dumps(mock_response_data))
            mock_request.return_value.__aenter__.return_value = mock_response
            
            async with api_client:
                response = await api_client.get_agent_status()
            
            assert response.success is True
            assert response.data["systemStatus"]["runningAgents"] == 2
    
    @pytest.mark.asyncio
    async def test_health_check(self, api_client):
        """Test API health check."""
        mock_response_data = {
            "success": True,
            "data": {
                "status": "healthy",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        with patch('aiohttp.ClientSession.request') as mock_request:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text = AsyncMock(return_value=json.dumps(mock_response_data))
            mock_request.return_value.__aenter__.return_value = mock_response
            
            async with api_client:
                response = await api_client.health_check()
            
            assert response.success is True
    
    @pytest.mark.asyncio
    async def test_test_connection(self, api_client):
        """Test connection testing."""
        # Test successful connection
        with patch.object(api_client, 'health_check') as mock_health:
            mock_health.return_value = Mock(success=True)
            
            result = await api_client.test_connection()
            assert result is True
        
        # Test failed connection
        with patch.object(api_client, 'health_check') as mock_health:
            mock_health.return_value = Mock(success=False)
            
            result = await api_client.test_connection()
            assert result is False

class TestSystemMonitoring:
    """Test cases for system monitoring."""
    
    @pytest.fixture
    def mock_api_client(self):
        """Create a mock API client."""
        client = Mock(spec=NodeApiClient)
        client.test_connection = AsyncMock()
        client.get_agent_status = AsyncMock()
        return client
    
    @pytest.fixture
    def monitor_config(self):
        """Configuration for system monitor."""
        return {
            "alerts": {
                "response_time_threshold": 5.0,
                "error_rate_threshold": 0.3
            },
            "email": {
                "enabled": False
            }
        }
    
    @pytest.fixture
    def system_monitor(self, mock_api_client, monitor_config):
        """Create a system monitor for testing."""
        return create_monitor(mock_api_client, monitor_config)
    
    @pytest.mark.asyncio
    async def test_monitor_initialization(self, system_monitor):
        """Test monitor initialization."""
        assert system_monitor.is_monitoring is False
        assert len(system_monitor.alert_handlers) >= 2  # Console and file handlers
    
    @pytest.mark.asyncio
    async def test_collect_metrics_healthy(self, system_monitor, mock_api_client):
        """Test metrics collection when system is healthy."""
        # Mock healthy API
        mock_api_client.test_connection.return_value = True
        mock_api_client.get_agent_status.return_value = Mock(
            success=True,
            data={
                "systemStatus": {
                    "runningAgents": 2,
                    "totalAgents": 4
                }
            }
        )
        
        await system_monitor._collect_metrics()
        
        metrics = system_monitor.get_current_metrics()
        assert metrics is not None
        assert metrics.api_connectivity == HealthStatus.HEALTHY
        assert metrics.active_agents == 2
    
    @pytest.mark.asyncio
    async def test_collect_metrics_unhealthy(self, system_monitor, mock_api_client):
        """Test metrics collection when system is unhealthy."""
        # Mock unhealthy API
        mock_api_client.test_connection.return_value = False
        
        await system_monitor._collect_metrics()
        
        metrics = system_monitor.get_current_metrics()
        assert metrics is not None
        assert metrics.api_connectivity == HealthStatus.UNHEALTHY
    
    @pytest.mark.asyncio
    async def test_alert_creation(self, system_monitor):
        """Test alert creation and handling."""
        initial_alert_count = len(system_monitor.alerts)
        
        await system_monitor._create_alert(
            AlertLevel.ERROR,
            "Test Alert",
            "This is a test alert",
            "test_component"
        )
        
        assert len(system_monitor.alerts) == initial_alert_count + 1
        
        # Check that duplicate alerts are not created
        await system_monitor._create_alert(
            AlertLevel.ERROR,
            "Test Alert",
            "This is a test alert",
            "test_component"
        )
        
        assert len(system_monitor.alerts) == initial_alert_count + 1
    
    @pytest.mark.asyncio
    async def test_alert_resolution(self, system_monitor):
        """Test alert resolution."""
        # Create an alert
        await system_monitor._create_alert(
            AlertLevel.WARNING,
            "Test Alert",
            "This is a test alert",
            "test_component"
        )
        
        active_alerts = system_monitor.get_active_alerts()
        assert len(active_alerts) == 1
        assert not active_alerts[0].resolved
        
        # Resolve the alert
        await system_monitor._resolve_alerts("test_component")
        
        active_alerts = system_monitor.get_active_alerts()
        assert len(active_alerts) == 0
    
    @pytest.mark.asyncio
    async def test_monitoring_loop(self, system_monitor, mock_api_client):
        """Test the monitoring loop."""
        mock_api_client.test_connection.return_value = True
        
        # Start monitoring for a short time
        await system_monitor.start_monitoring(interval=0.1)
        await asyncio.sleep(0.3)  # Let it run for a few cycles
        await system_monitor.stop_monitoring()
        
        # Should have collected some metrics
        assert len(system_monitor.metrics_history) > 0
    
    def test_health_summary(self, system_monitor):
        """Test health summary generation."""
        # Test with no metrics
        summary = system_monitor.get_health_summary()
        assert summary["status"] == HealthStatus.UNKNOWN.value
        
        # Add some metrics
        from monitoring import HealthMetrics
        metrics = HealthMetrics(
            api_connectivity=HealthStatus.HEALTHY,
            last_successful_sync=datetime.now(),
            failed_sync_count=0,
            average_response_time=1.5,
            active_agents=2,
            total_jobs_synced=10,
            error_rate=0.1,
            uptime_percentage=95.0
        )
        system_monitor.metrics_history.append(metrics)
        
        summary = system_monitor.get_health_summary()
        assert summary["status"] == HealthStatus.HEALTHY.value
        assert summary["active_agents"] == 2
        assert summary["error_rate"] == "10.0%"

class TestCoordinatorIntegration:
    """Test cases for coordinator integration with API."""
    
    @pytest.fixture
    def coordinator_config(self):
        """Configuration for coordinator testing."""
        return {
            "agents": {
                "test_agent": {
                    "enabled": True,
                    "max_retries": 1,
                    "timeout": 5
                }
            },
            "api": {
                "base_url": "http://localhost:3000/api",
                "api_key": "test-key",
                "timeout": 10,
                "max_retries": 2
            }
        }
    
    @pytest.mark.asyncio
    async def test_coordinator_api_sync(self, coordinator_config):
        """Test coordinator API synchronization."""
        with patch('coordinator.ScraperOrchestrator') as mock_orchestrator:
            # Mock scraper results
            mock_orchestrator.return_value.scrape_all_sources = AsyncMock(
                return_value={
                    "jobs": [
                        {
                            "title": "Test Job",
                            "company": "Test Company",
                            "to_dict": lambda: {"title": "Test Job", "company": "Test Company"}
                        }
                    ],
                    "stats": {"test_agent": {"jobs_found": 1, "status": "success"}}
                }
            )
            
            # Mock API client
            with patch('coordinator.create_api_client') as mock_create_client:
                mock_client = AsyncMock()
                mock_client.test_connection.return_value = True
                mock_client.sync_jobs.return_value = Mock(
                    success=True,
                    data={"jobsProcessed": 1, "jobsInserted": 1}
                )
                mock_create_client.return_value = mock_client
                
                # Create coordinator with test config
                coordinator = AgentCoordinator()
                coordinator.config = coordinator_config
                
                # Run agents
                results = await coordinator.run_all_agents()
                
                # Verify API sync was called
                mock_client.sync_jobs.assert_called_once()
                assert results["api_sync_status"] == "success"
    
    @pytest.mark.asyncio
    async def test_coordinator_api_failure_handling(self, coordinator_config):
        """Test coordinator handling of API failures."""
        with patch('coordinator.ScraperOrchestrator') as mock_orchestrator:
            mock_orchestrator.return_value.scrape_all_sources = AsyncMock(
                return_value={
                    "jobs": [{"title": "Test Job", "to_dict": lambda: {"title": "Test Job"}}],
                    "stats": {"test_agent": {"jobs_found": 1}}
                }
            )
            
            # Mock API client that fails
            with patch('coordinator.create_api_client') as mock_create_client:
                mock_client = AsyncMock()
                mock_client.test_connection.return_value = False
                mock_client.sync_jobs.side_effect = NetworkError("Connection failed")
                mock_create_client.return_value = mock_client
                
                coordinator = AgentCoordinator()
                coordinator.config = coordinator_config
                
                results = await coordinator.run_all_agents()
                
                # Should handle the error gracefully
                assert results["api_sync_status"] == "network_error"

class TestEndToEndIntegration:
    """End-to-end integration tests."""
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_full_agent_to_api_flow(self):
        """Test complete flow from agent execution to API sync."""
        # This test requires a running API server
        # Skip if not in integration test environment
        if not os.getenv('RUN_INTEGRATION_TESTS'):
            pytest.skip("Integration tests not enabled")
        
        api_url = os.getenv('TEST_API_URL', 'http://localhost:3000/api')
        api_key = os.getenv('TEST_API_KEY', 'test-key')
        
        # Create real API client
        client = create_api_client(api_url, api_key, timeout=10)
        
        try:
            async with client:
                # Test connection
                is_connected = await client.test_connection()
                if not is_connected:
                    pytest.skip("API server not available")
                
                # Test job sync
                test_jobs = [
                    {
                        "title": "Integration Test Job",
                        "company": "Test Company",
                        "location": "Remote",
                        "description": "Test job for integration testing",
                        "requirements": ["Testing"],
                        "benefits": [],
                        "jobType": "full-time",
                        "remote": True,
                        "source": "test",
                        "sourceUrl": f"https://test.com/job/{datetime.now().timestamp()}",
                        "postedDate": datetime.now().isoformat(),
                        "relevanceScore": 75
                    }
                ]
                
                test_stats = {
                    "test_agent": {
                        "status": "success",
                        "jobs_found": 1
                    }
                }
                
                response = await client.sync_jobs(test_jobs, test_stats)
                
                assert response.success is True
                assert response.data["jobsProcessed"] == 1
                
                # Test getting agent status
                status_response = await client.get_agent_status()
                assert status_response.success is True
                
        except Exception as e:
            pytest.fail(f"Integration test failed: {str(e)}")

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])