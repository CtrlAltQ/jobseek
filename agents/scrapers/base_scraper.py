"""
Base Job Scraper Class

This module provides the foundation for all job scraping implementations.
It includes common functionality for web scraping, data extraction, and error handling.
"""

import asyncio
import logging
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, asdict
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import random

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import USER_AGENTS, REQUEST_DELAY, MAX_RETRIES

logger = logging.getLogger(__name__)

@dataclass
class JobData:
    """Standardized job data structure."""
    title: str
    company: str
    location: str
    description: str
    requirements: List[str]
    benefits: List[str]
    job_type: str  # 'full-time', 'part-time', 'contract', 'internship'
    remote: bool
    source: str
    source_url: str
    posted_date: datetime
    discovered_date: datetime
    relevance_score: float = 0.0
    status: str = 'new'
    ai_summary: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = 'USD'
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API submission."""
        data = asdict(self)
        # Convert datetime objects to ISO strings
        data['posted_date'] = self.posted_date.isoformat()
        data['discovered_date'] = self.discovered_date.isoformat()
        
        # Structure salary data
        if self.salary_min or self.salary_max:
            data['salary'] = {
                'min': self.salary_min,
                'max': self.salary_max,
                'currency': self.salary_currency
            }
        
        # Remove individual salary fields
        for field in ['salary_min', 'salary_max', 'salary_currency']:
            data.pop(field, None)
            
        return data
    
    def get_hash(self) -> str:
        """Generate unique hash for duplicate detection."""
        # Use title, company, and source_url for uniqueness
        unique_string = f"{self.title}|{self.company}|{self.source_url}"
        return hashlib.md5(unique_string.encode()).hexdigest()

class BaseJobScraper(ABC):
    """Abstract base class for all job scrapers."""
    
    def __init__(self, source_name: str, base_url: str, rate_limit: float = 1.0):
        self.source_name = source_name
        self.base_url = base_url
        self.rate_limit = rate_limit
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.jobs_found: List[JobData] = []
        self.duplicate_hashes: Set[str] = set()
        self.errors: List[str] = []
        self.start_time = datetime.now()
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.setup_browser()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.cleanup()
        
    async def setup_browser(self):
        """Initialize Playwright browser and context."""
        try:
            self.playwright = await async_playwright().start()
            
            # Launch browser with stealth settings
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-default-apps'
                ]
            )
            
            # Create context with random user agent
            user_agent = random.choice(USER_AGENTS)
            self.context = await self.browser.new_context(
                user_agent=user_agent,
                viewport={'width': 1920, 'height': 1080},
                extra_http_headers={
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            )
            
            # Create page
            self.page = await self.context.new_page()
            
            # Set up request interception for better stealth
            await self.page.route('**/*', self._handle_route)
            
            logger.info(f"Browser setup complete for {self.source_name}")
            
        except Exception as e:
            error_msg = f"Failed to setup browser for {self.source_name}: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            raise
    
    async def _handle_route(self, route):
        """Handle route interception for stealth browsing."""
        # Block unnecessary resources to speed up scraping
        resource_type = route.request.resource_type
        if resource_type in ['image', 'media', 'font', 'stylesheet']:
            await route.abort()
        else:
            await route.continue_()
    
    async def cleanup(self):
        """Clean up browser resources."""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
            logger.info(f"Browser cleanup complete for {self.source_name}")
        except Exception as e:
            logger.error(f"Error during cleanup for {self.source_name}: {str(e)}")
    
    async def scrape_jobs(self, search_params: Dict) -> List[JobData]:
        """Main scraping method - to be implemented by subclasses."""
        try:
            logger.info(f"Starting job scraping for {self.source_name}")
            
            # Implement rate limiting
            await asyncio.sleep(1 / self.rate_limit)
            
            # Call the abstract scraping method
            jobs = await self._scrape_jobs_impl(search_params)
            
            # Filter duplicates
            unique_jobs = self._filter_duplicates(jobs)
            
            self.jobs_found = unique_jobs
            
            logger.info(f"Scraping complete for {self.source_name}: {len(unique_jobs)} unique jobs found")
            return unique_jobs
            
        except Exception as e:
            error_msg = f"Scraping failed for {self.source_name}: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return []
    
    @abstractmethod
    async def _scrape_jobs_impl(self, search_params: Dict) -> List[JobData]:
        """Abstract method for actual scraping implementation."""
        pass
    
    def _filter_duplicates(self, jobs: List[JobData]) -> List[JobData]:
        """Filter out duplicate jobs based on hash."""
        unique_jobs = []
        
        for job in jobs:
            job_hash = job.get_hash()
            if job_hash not in self.duplicate_hashes:
                self.duplicate_hashes.add(job_hash)
                unique_jobs.append(job)
            else:
                logger.debug(f"Duplicate job filtered: {job.title} at {job.company}")
        
        logger.info(f"Filtered {len(jobs) - len(unique_jobs)} duplicates from {self.source_name}")
        return unique_jobs
    
    async def safe_page_goto(self, url: str, retries: int = MAX_RETRIES) -> bool:
        """Safely navigate to a URL with retries."""
        for attempt in range(retries):
            try:
                await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
                await asyncio.sleep(REQUEST_DELAY)
                return True
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    error_msg = f"Failed to load {url} after {retries} attempts"
                    logger.error(error_msg)
                    self.errors.append(error_msg)
                    return False
    
    async def safe_wait_for_selector(self, selector: str, timeout: int = 10000) -> bool:
        """Safely wait for a selector with error handling."""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception as e:
            logger.warning(f"Selector '{selector}' not found: {str(e)}")
            return False
    
    async def extract_text_safe(self, selector: str, default: str = "") -> str:
        """Safely extract text from an element."""
        try:
            element = await self.page.query_selector(selector)
            if element:
                text = await element.text_content()
                return text.strip() if text else default
            return default
        except Exception as e:
            logger.debug(f"Failed to extract text from '{selector}': {str(e)}")
            return default
    
    async def extract_attribute_safe(self, selector: str, attribute: str, default: str = "") -> str:
        """Safely extract an attribute from an element."""
        try:
            element = await self.page.query_selector(selector)
            if element:
                attr_value = await element.get_attribute(attribute)
                return attr_value.strip() if attr_value else default
            return default
        except Exception as e:
            logger.debug(f"Failed to extract attribute '{attribute}' from '{selector}': {str(e)}")
            return default
    
    def get_execution_stats(self) -> Dict:
        """Get execution statistics."""
        end_time = datetime.now()
        duration = end_time - self.start_time
        
        return {
            'source': self.source_name,
            'start_time': self.start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'duration_seconds': duration.total_seconds(),
            'jobs_found': len(self.jobs_found),
            'jobs_processed': len(self.jobs_found),  # Will be updated in processing pipeline
            'errors': self.errors,
            'error_count': len(self.errors),
            'status': 'success' if not self.errors else 'partial' if self.jobs_found else 'failed'
        }