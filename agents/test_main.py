#!/usr/bin/env python3
"""
Basic test for the agent orchestrator setup.
"""

import pytest
import asyncio
from main import AgentOrchestrator

@pytest.mark.asyncio
async def test_agent_orchestrator_initialization():
    """Test that the AgentOrchestrator initializes correctly."""
    orchestrator = AgentOrchestrator()
    
    assert orchestrator.jobs_found == 0
    assert orchestrator.jobs_processed == 0
    assert orchestrator.errors == []
    assert orchestrator.start_time is not None

@pytest.mark.asyncio
async def test_run_agent():
    """Test that run_agent method works without errors."""
    orchestrator = AgentOrchestrator()
    
    # Test with a mock config
    config = {'enabled': True, 'rate_limit': 1}
    
    # This should not raise an exception
    await orchestrator.run_agent('test_source', config)

if __name__ == "__main__":
    pytest.main([__file__])