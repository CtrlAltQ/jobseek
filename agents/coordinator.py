"""
Agent Coordinator

This module provides the main coordination layer for managing multiple job scraping agents,
handling scheduling, status tracking, and error recovery.
"""

import asyncio
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path

from scrapers.scraper_orchestrator import ScraperOrchestrator
from ai.job_processor import JobProcessingPipeline
# AI client is imported by JobProcessingPipeline
from config import NODEJS_API_URL, AGENT_API_KEY

logger = logging.getLogger(__name__)

class AgentStatus(Enum):
    """Agent execution status."""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"

@dataclass
class AgentExecution:
    """Represents a single agent execution."""
    execution_id: str
    agent_id: str
    source: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: AgentStatus = AgentStatus.RUNNING
    jobs_found: int = 0
    jobs_processed: int = 0
    errors: List[str] = None
    retry_count: int = 0
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API/logging."""
        data = asdict(self)
        data['start_time'] = self.start_time.isoformat()
        data['end_time'] = self.end_time.isoformat() if self.end_time else None
        data['status'] = self.status.value
        return data

@dataclass
class AgentConfig:
    """Configuration for agent execution."""
    enabled: bool = True
    max_retries: int = 3
    retry_delay: int = 300  # 5 minutes
    timeout: int = 1800  # 30 minutes
    rate_limit: float = 1.0  # requests per second
    search_params: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.search_params is None:
            self.search_params = {}

class AgentCoordinator:
    """Main coordinator for managing job scraping agents."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the agent coordinator.
        
        Args:
            config_path: Path to configuration file
        """
        self.config_path = config_path or "agent_config.json"
        self.config = self._load_config()
        self.executions: Dict[str, AgentExecution] = {}
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.orchestrator = ScraperOrchestrator(self.config.get('scraping', {}))
        self.job_processor = None
        self.status = AgentStatus.IDLE
        self.last_execution_time: Optional[datetime] = None
        
        # Initialize AI processor if configured
        if self.config.get('ai', {}).get('enabled', False):
            try:
                ai_provider = self.config.get('ai', {}).get('provider', 'openai')
                self.job_processor = JobProcessingPipeline(ai_provider)
                logger.info(f"AI processor initialized with {ai_provider}")
            except Exception as e:
                logger.warning(f"Failed to initialize AI processor: {e}")
                logger.info("Continuing without AI processing")
                self.job_processor = None
        else:
            logger.info("AI processing disabled in configuration")
        
        logger.info(f"Agent coordinator initialized with {len(self.config.get('agents', {}))} agents")
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or create default."""
        config_file = Path(self.config_path)
        
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                logger.info(f"Loaded configuration from {self.config_path}")
                return config
            except Exception as e:
                logger.error(f"Failed to load config from {self.config_path}: {e}")
        
        # Return default configuration
        default_config = {
            "agents": {
                "indeed": {
                    "enabled": True,
                    "max_retries": 3,
                    "retry_delay": 300,
                    "timeout": 1800,
                    "rate_limit": 1.0,
                    "search_params": {
                        "job_titles": ["Software Engineer", "Frontend Developer", "Full Stack Developer"],
                        "keywords": ["React", "JavaScript", "Python", "Remote"],
                        "locations": ["Remote", "Nashville, TN"],
                        "remote_ok": True,
                        "job_type": "full-time",
                        "days_back": 7,
                        "max_pages": 3
                    }
                },
                "linkedin": {
                    "enabled": True,
                    "max_retries": 2,
                    "retry_delay": 600,
                    "timeout": 2400,
                    "rate_limit": 0.5,
                    "search_params": {
                        "job_titles": ["Software Engineer", "Frontend Developer"],
                        "keywords": ["React", "TypeScript", "Node.js"],
                        "locations": ["Remote", "Nashville, TN"],
                        "remote_ok": True,
                        "job_type": "full-time",
                        "days_back": 7,
                        "max_pages": 2
                    }
                },
                "remote_ok": {
                    "enabled": True,
                    "max_retries": 3,
                    "retry_delay": 180,
                    "timeout": 900,
                    "rate_limit": 1.0,
                    "search_params": {
                        "job_titles": ["Developer", "Engineer"],
                        "keywords": ["JavaScript", "Python", "React"],
                        "remote_ok": True,
                        "job_type": "full-time",
                        "days_back": 7,
                        "max_pages": 5
                    }
                },
                "weworkremotely": {
                    "enabled": True,
                    "max_retries": 3,
                    "retry_delay": 180,
                    "timeout": 900,
                    "rate_limit": 1.0,
                    "search_params": {
                        "job_titles": ["Developer", "Engineer"],
                        "keywords": ["JavaScript", "Python", "React"],
                        "remote_ok": True,
                        "job_type": "full-time",
                        "days_back": 7,
                        "max_pages": 3
                    }
                }
            },
            "scraping": {
                "max_retries": 2,
                "retry_delay": 5,
                "sources": {
                    "indeed": {"enabled": True},
                    "linkedin": {"enabled": True},
                    "remote_ok": {"enabled": True},
                    "weworkremotely": {"enabled": True}
                }
            },
            "ai": {
                "enabled": True,
                "relevance_threshold": 70,
                "process_descriptions": True,
                "generate_summaries": True
            },
            "api": {
                "base_url": NODEJS_API_URL,
                "api_key": AGENT_API_KEY,
                "timeout": 30,
                "max_retries": 3
            },
            "logging": {
                "level": "INFO",
                "max_log_files": 10,
                "max_log_size_mb": 50
            }
        }
        
        # Save default config
        self._save_config(default_config)
        return default_config
    
    def _save_config(self, config: Dict[str, Any]) -> None:
        """Save configuration to file."""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2, default=str)
            logger.info(f"Configuration saved to {self.config_path}")
        except Exception as e:
            logger.error(f"Failed to save config to {self.config_path}: {e}")
    
    def update_config(self, updates: Dict[str, Any]) -> None:
        """Update configuration with new values."""
        def deep_update(base_dict, update_dict):
            for key, value in update_dict.items():
                if isinstance(value, dict) and key in base_dict and isinstance(base_dict[key], dict):
                    deep_update(base_dict[key], value)
                else:
                    base_dict[key] = value
        
        deep_update(self.config, updates)
        self._save_config(self.config)
        logger.info("Configuration updated")
    
    async def run_all_agents(self) -> Dict[str, Any]:
        """
        Run all enabled agents and return aggregated results.
        
        Returns:
            Dictionary containing execution results and statistics
        """
        if self.status == AgentStatus.RUNNING:
            logger.warning("Agents are already running")
            return {"error": "Agents are already running"}
        
        self.status = AgentStatus.RUNNING
        self.last_execution_time = datetime.now()
        
        logger.info("Starting coordinated agent execution")
        
        try:
            # Get enabled agents
            enabled_agents = {
                name: config for name, config in self.config.get('agents', {}).items()
                if config.get('enabled', False)
            }
            
            if not enabled_agents:
                logger.warning("No enabled agents found")
                self.status = AgentStatus.COMPLETED
                return {"error": "No enabled agents configured"}
            
            # Start agent executions
            agent_tasks = []
            for agent_name, agent_config in enabled_agents.items():
                task = asyncio.create_task(
                    self._run_agent_with_retry(agent_name, AgentConfig(**agent_config))
                )
                agent_tasks.append(task)
                self.active_tasks[agent_name] = task
            
            # Wait for all agents to complete
            results = await asyncio.gather(*agent_tasks, return_exceptions=True)
            
            # Process results
            all_jobs = []
            execution_stats = {}
            total_errors = []
            
            for i, result in enumerate(results):
                agent_name = list(enabled_agents.keys())[i]
                
                if isinstance(result, Exception):
                    error_msg = f"Agent {agent_name} failed: {str(result)}"
                    logger.error(error_msg)
                    total_errors.append(error_msg)
                    execution_stats[agent_name] = {
                        'status': 'failed',
                        'jobs_found': 0,
                        'error': str(result)
                    }
                else:
                    jobs, stats = result
                    all_jobs.extend(jobs)
                    execution_stats[agent_name] = stats
            
            # Process jobs through AI if enabled
            if self.job_processor and all_jobs:
                logger.info(f"Processing {len(all_jobs)} jobs through AI pipeline")
                processed_jobs = await self._process_jobs_with_ai(all_jobs)
                all_jobs = processed_jobs
            
            # Send results to API
            api_result = await self._send_results_to_api(all_jobs, execution_stats)
            
            # Compile final results
            final_results = {
                'execution_id': f"exec_{int(time.time())}",
                'timestamp': datetime.now().isoformat(),
                'agents_run': len(enabled_agents),
                'total_jobs_found': len(all_jobs),
                'jobs_sent_to_api': api_result.get('jobs_processed', 0),
                'execution_stats': execution_stats,
                'errors': total_errors,
                'api_sync_status': api_result.get('status', 'unknown'),
                'duration_seconds': (datetime.now() - self.last_execution_time).total_seconds()
            }
            
            self.status = AgentStatus.COMPLETED
            logger.info(f"Agent execution completed: {len(all_jobs)} jobs found")
            
            return final_results
            
        except Exception as e:
            self.status = AgentStatus.FAILED
            logger.error(f"Agent execution failed: {str(e)}")
            raise
        finally:
            # Clean up active tasks
            self.active_tasks.clear()
    
    async def _run_agent_with_retry(self, agent_name: str, agent_config: AgentConfig) -> tuple:
        """
        Run a single agent with retry logic.
        
        Args:
            agent_name: Name of the agent
            agent_config: Agent configuration
            
        Returns:
            Tuple of (jobs, stats)
        """
        execution_id = f"{agent_name}_{int(time.time())}"
        execution = AgentExecution(
            execution_id=execution_id,
            agent_id=agent_name,
            source=agent_name,
            start_time=datetime.now()
        )
        
        self.executions[execution_id] = execution
        
        for attempt in range(agent_config.max_retries + 1):
            try:
                execution.retry_count = attempt
                execution.status = AgentStatus.RUNNING if attempt == 0 else AgentStatus.RETRYING
                
                logger.info(f"Running agent {agent_name} (attempt {attempt + 1}/{agent_config.max_retries + 1})")
                
                # Run the agent with timeout
                jobs, stats = await asyncio.wait_for(
                    self._execute_agent(agent_name, agent_config.search_params),
                    timeout=agent_config.timeout
                )
                
                # Update execution record
                execution.end_time = datetime.now()
                execution.status = AgentStatus.COMPLETED
                execution.jobs_found = len(jobs)
                execution.jobs_processed = len(jobs)
                
                logger.info(f"Agent {agent_name} completed successfully: {len(jobs)} jobs found")
                return jobs, stats
                
            except asyncio.TimeoutError:
                error_msg = f"Agent {agent_name} timed out after {agent_config.timeout} seconds"
                logger.warning(error_msg)
                execution.errors.append(error_msg)
                
            except Exception as e:
                error_msg = f"Agent {agent_name} failed: {str(e)}"
                logger.warning(error_msg)
                execution.errors.append(error_msg)
            
            # Retry logic
            if attempt < agent_config.max_retries:
                logger.info(f"Retrying agent {agent_name} in {agent_config.retry_delay} seconds...")
                await asyncio.sleep(agent_config.retry_delay)
            else:
                execution.end_time = datetime.now()
                execution.status = AgentStatus.FAILED
                logger.error(f"Agent {agent_name} failed after {agent_config.max_retries + 1} attempts")
                raise Exception(f"Agent {agent_name} failed after all retry attempts")
    
    async def _execute_agent(self, agent_name: str, search_params: Dict[str, Any]) -> tuple:
        """
        Execute a single agent.
        
        Args:
            agent_name: Name of the agent
            search_params: Search parameters for the agent
            
        Returns:
            Tuple of (jobs, stats)
        """
        # Use the orchestrator to run the specific source
        temp_config = {
            'sources': {agent_name: {'enabled': True}},
            'max_retries': 1,  # Retries are handled at coordinator level
            'retry_delay': 1
        }
        
        temp_orchestrator = ScraperOrchestrator(temp_config)
        results = await temp_orchestrator.scrape_all_sources(search_params)
        
        jobs = results.get('jobs', [])
        stats = results.get('stats', {}).get(agent_name, {})
        
        return jobs, stats
    
    async def _process_jobs_with_ai(self, jobs: List) -> List:
        """Process jobs through AI pipeline."""
        if not self.job_processor:
            return jobs
        
        try:
            ai_config = self.config.get('ai', {})
            user_profile = self.config.get('user_profile', {})
            
            # Use the processing pipeline
            enhanced_jobs = await self.job_processor.process_jobs(jobs, user_profile)
            
            # Filter by relevance threshold
            threshold = ai_config.get('relevance_threshold', 70) / 100.0  # Convert to 0-1 scale
            filtered_jobs = [job for job in enhanced_jobs if job.relevance_score >= threshold]
            
            logger.info(f"AI processing: {len(filtered_jobs)}/{len(jobs)} jobs passed relevance threshold")
            return filtered_jobs
            
        except Exception as e:
            logger.error(f"AI processing failed: {str(e)}")
            return jobs  # Return original jobs if AI processing fails
    
    async def _send_results_to_api(self, jobs: List, stats: Dict) -> Dict:
        """Send results to the Node.js API."""
        try:
            from api_client import create_api_client, ApiClientError, AuthenticationError, NetworkError
            
            api_config = self.config.get('api', {})
            base_url = api_config.get('base_url', NODEJS_API_URL)
            api_key = api_config.get('api_key', AGENT_API_KEY)
            
            if not base_url or not api_key:
                logger.warning("API configuration missing, skipping API sync")
                return {'status': 'skipped', 'reason': 'missing_config'}
            
            # Create API client
            client = create_api_client(
                base_url=base_url,
                api_key=api_key,
                timeout=api_config.get('timeout', 30),
                max_retries=api_config.get('max_retries', 3)
            )
            
            # Convert jobs to dictionaries
            job_dicts = []
            for job in jobs:
                if hasattr(job, 'to_dict'):
                    job_dicts.append(job.to_dict())
                elif isinstance(job, dict):
                    job_dicts.append(job)
                else:
                    logger.warning(f"Unknown job format: {type(job)}")
                    continue
            
            async with client:
                # Test connection first
                if not await client.test_connection():
                    logger.warning("API connection test failed, but attempting sync anyway")
                
                # Sync jobs
                response = await client.sync_jobs(
                    jobs=job_dicts,
                    execution_stats=stats,
                    agent_version='1.0.0'
                )
                
                if response.success:
                    data = response.data or {}
                    return {
                        'status': 'success',
                        'jobs_processed': len(job_dicts),
                        'jobs_inserted': data.get('jobsInserted', 0),
                        'jobs_updated': data.get('jobsUpdated', 0),
                        'logs_created': data.get('logsCreated', 0),
                        'response': data
                    }
                else:
                    logger.error(f"API sync failed: {response.error}")
                    return {
                        'status': 'failed',
                        'error': response.error,
                        'status_code': response.status_code
                    }
        
        except AuthenticationError as e:
            logger.error(f"API authentication failed: {str(e)}")
            return {'status': 'auth_failed', 'error': str(e)}
        except NetworkError as e:
            logger.error(f"API network error: {str(e)}")
            return {'status': 'network_error', 'error': str(e)}
        except ApiClientError as e:
            logger.error(f"API client error: {str(e)}")
            return {'status': 'client_error', 'error': str(e)}
        except Exception as e:
            logger.error(f"Unexpected error sending results to API: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def get_status(self) -> Dict[str, Any]:
        """Get current coordinator status."""
        return {
            'status': self.status.value,
            'last_execution_time': self.last_execution_time.isoformat() if self.last_execution_time else None,
            'active_agents': list(self.active_tasks.keys()),
            'total_executions': len(self.executions),
            'recent_executions': [
                execution.to_dict() for execution in 
                sorted(self.executions.values(), key=lambda x: x.start_time, reverse=True)[:10]
            ]
        }
    
    def get_execution_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent execution logs."""
        sorted_executions = sorted(
            self.executions.values(),
            key=lambda x: x.start_time,
            reverse=True
        )
        
        return [execution.to_dict() for execution in sorted_executions[:limit]]
    
    async def stop_all_agents(self) -> Dict[str, Any]:
        """Stop all running agents."""
        if self.status != AgentStatus.RUNNING:
            return {'status': 'no_agents_running'}
        
        logger.info("Stopping all running agents...")
        
        # Cancel all active tasks
        cancelled_count = 0
        for agent_name, task in self.active_tasks.items():
            if not task.done():
                task.cancel()
                cancelled_count += 1
                logger.info(f"Cancelled agent: {agent_name}")
        
        # Wait for tasks to complete cancellation
        if self.active_tasks:
            await asyncio.gather(*self.active_tasks.values(), return_exceptions=True)
        
        self.active_tasks.clear()
        self.status = AgentStatus.IDLE
        
        return {
            'status': 'stopped',
            'agents_cancelled': cancelled_count,
            'timestamp': datetime.now().isoformat()
        }