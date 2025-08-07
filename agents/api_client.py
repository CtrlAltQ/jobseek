"""
API Client for Node.js Backend Communication

This module provides a client for Python agents to communicate with the Node.js API,
including job data synchronization, agent status updates, and error reporting.
"""

import asyncio
import aiohttp
import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class ApiClientError(Exception):
    """Base exception for API client errors."""
    pass

class AuthenticationError(ApiClientError):
    """Raised when API authentication fails."""
    pass

class NetworkError(ApiClientError):
    """Raised when network communication fails."""
    pass

class ValidationError(ApiClientError):
    """Raised when request data validation fails."""
    pass

@dataclass
class ApiResponse:
    """Represents an API response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    status_code: int = 200
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], status_code: int = 200) -> 'ApiResponse':
        """Create ApiResponse from dictionary."""
        return cls(
            success=data.get('success', False),
            data=data.get('data'),
            error=data.get('error'),
            status_code=status_code
        )

class NodeApiClient:
    """Client for communicating with the Node.js API."""
    
    def __init__(self, base_url: str, api_key: str, timeout: int = 30, max_retries: int = 3):
        """
        Initialize the API client.
        
        Args:
            base_url: Base URL of the Node.js API
            api_key: API key for authentication
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.max_retries = max_retries
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Validate configuration
        if not base_url or not api_key:
            raise ValueError("base_url and api_key are required")
        
        logger.info(f"API client initialized for {self.base_url}")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_session(self):
        """Ensure aiohttp session is created."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=self.timeout,
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'AI-Job-Finder-Agent/1.0.0'
                }
            )
    
    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> ApiResponse:
        """
        Make an HTTP request with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            data: Request body data
            params: Query parameters
            
        Returns:
            ApiResponse object
            
        Raises:
            ApiClientError: For various API errors
        """
        await self._ensure_session()
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        for attempt in range(self.max_retries + 1):
            try:
                logger.debug(f"Making {method} request to {url} (attempt {attempt + 1})")
                
                async with self.session.request(
                    method=method,
                    url=url,
                    json=data if data else None,
                    params=params
                ) as response:
                    response_text = await response.text()
                    
                    # Try to parse JSON response
                    try:
                        response_data = json.loads(response_text) if response_text else {}
                    except json.JSONDecodeError:
                        response_data = {'error': f'Invalid JSON response: {response_text[:200]}'}
                    
                    api_response = ApiResponse.from_dict(response_data, response.status)
                    
                    # Handle different status codes
                    if response.status == 401:
                        raise AuthenticationError(f"Authentication failed: {api_response.error}")
                    elif response.status == 400:
                        raise ValidationError(f"Validation error: {api_response.error}")
                    elif response.status >= 500:
                        # Server error - retry
                        if attempt < self.max_retries:
                            wait_time = 2 ** attempt  # Exponential backoff
                            logger.warning(f"Server error {response.status}, retrying in {wait_time}s...")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            raise NetworkError(f"Server error after {self.max_retries + 1} attempts: {api_response.error}")
                    elif response.status >= 400:
                        raise ApiClientError(f"HTTP {response.status}: {api_response.error}")
                    
                    logger.debug(f"Request successful: {response.status}")
                    return api_response
                    
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                if attempt < self.max_retries:
                    wait_time = 2 ** attempt
                    logger.warning(f"Network error, retrying in {wait_time}s: {str(e)}")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise NetworkError(f"Network error after {self.max_retries + 1} attempts: {str(e)}")
            except (AuthenticationError, ValidationError):
                # Don't retry authentication or validation errors
                raise
            except Exception as e:
                logger.error(f"Unexpected error in API request: {str(e)}")
                raise ApiClientError(f"Unexpected error: {str(e)}")
        
        raise ApiClientError("Max retries exceeded")
    
    async def sync_jobs(
        self, 
        jobs: List[Dict[str, Any]], 
        execution_stats: Dict[str, Any],
        agent_version: str = "1.0.0"
    ) -> ApiResponse:
        """
        Sync job data to the API.
        
        Args:
            jobs: List of job dictionaries
            execution_stats: Statistics from agent execution
            agent_version: Version of the agent
            
        Returns:
            ApiResponse with sync results
        """
        payload = {
            'jobs': jobs,
            'execution_stats': execution_stats,
            'timestamp': datetime.now().isoformat(),
            'agent_version': agent_version
        }
        
        logger.info(f"Syncing {len(jobs)} jobs to API")
        
        try:
            response = await self._make_request('POST', '/agents/sync', data=payload)
            
            if response.success:
                data = response.data or {}
                logger.info(
                    f"Successfully synced jobs: "
                    f"{data.get('jobsInserted', 0)} inserted, "
                    f"{data.get('jobsUpdated', 0)} updated, "
                    f"{data.get('logsCreated', 0)} logs created"
                )
            else:
                logger.error(f"Job sync failed: {response.error}")
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to sync jobs: {str(e)}")
            raise
    
    async def get_agent_status(self) -> ApiResponse:
        """
        Get current agent status from the API.
        
        Returns:
            ApiResponse with agent status data
        """
        try:
            response = await self._make_request('GET', '/agents/status')
            
            if response.success:
                logger.debug("Successfully retrieved agent status")
            else:
                logger.warning(f"Failed to get agent status: {response.error}")
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to get agent status: {str(e)}")
            raise
    
    async def get_agent_logs(
        self, 
        page: int = 1, 
        limit: int = 50,
        agent_id: Optional[str] = None,
        source: Optional[str] = None,
        status: Optional[str] = None
    ) -> ApiResponse:
        """
        Get agent logs from the API.
        
        Args:
            page: Page number for pagination
            limit: Number of logs per page
            agent_id: Filter by agent ID
            source: Filter by source
            status: Filter by status
            
        Returns:
            ApiResponse with logs data
        """
        params = {
            'page': page,
            'limit': limit
        }
        
        if agent_id:
            params['agentId'] = agent_id
        if source:
            params['source'] = source
        if status:
            params['status'] = status
        
        try:
            response = await self._make_request('GET', '/agents/logs', params=params)
            
            if response.success:
                data = response.data or {}
                logs_count = len(data.get('logs', []))
                logger.debug(f"Retrieved {logs_count} agent logs")
            else:
                logger.warning(f"Failed to get agent logs: {response.error}")
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to get agent logs: {str(e)}")
            raise
    
    async def health_check(self) -> ApiResponse:
        """
        Perform a health check against the API.
        
        Returns:
            ApiResponse indicating API health
        """
        try:
            response = await self._make_request('GET', '/health')
            
            if response.success:
                logger.debug("API health check passed")
            else:
                logger.warning(f"API health check failed: {response.error}")
            
            return response
            
        except Exception as e:
            logger.warning(f"API health check error: {str(e)}")
            # Return a failed response instead of raising
            return ApiResponse(
                success=False,
                error=f"Health check failed: {str(e)}",
                status_code=0
            )
    
    async def test_connection(self) -> bool:
        """
        Test the connection to the API.
        
        Returns:
            True if connection is successful, False otherwise
        """
        try:
            response = await self.health_check()
            return response.success
        except Exception:
            return False

# Convenience function for creating API client
def create_api_client(base_url: str, api_key: str, **kwargs) -> NodeApiClient:
    """
    Create and return a configured API client.
    
    Args:
        base_url: Base URL of the Node.js API
        api_key: API key for authentication
        **kwargs: Additional arguments for NodeApiClient
        
    Returns:
        Configured NodeApiClient instance
    """
    return NodeApiClient(base_url, api_key, **kwargs)