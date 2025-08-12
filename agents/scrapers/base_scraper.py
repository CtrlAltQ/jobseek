"""
Base Job Scraper Class

This module provides the foundation for all job scraping implementations.
It includes common functionality for web scraping using Playwright.
"""

import asyncio
import logging
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, asdict
import random
from playwright.async_api import async_playwright, Page, Browser, Playwright

from agents.config import USER_AGENTS, REQUEST_DELAY, MAX_RETRIES

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
    """Abstract base class for all job scrapers using Playwright."""
    
    def __init__(self, source_name: str, base_url: str, rate_limit: float = 1.0):
        self.source_name = source_name
        self.base_url = base_url
        self.rate_limit = rate_limit
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.jobs_found: List[JobData] = []
        self.duplicate_hashes: Set[str] = set()
        self.errors: List[str] = []
        self.start_time = datetime.now()
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.setup_session()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.cleanup()
        
    async def setup_session(self):
        """Initialize Playwright session."""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            self.page = await self.browser.new_page(
                user_agent=random.choice(USER_AGENTS)
            )
            logger.info(f"Playwright session setup complete for {self.source_name}")
        except Exception as e:
            error_msg = f"Failed to setup Playwright session for {self.source_name}: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            raise

    async def safe_page_goto(self, url: str, retries: int = MAX_RETRIES) -> bool:
        """Safely navigate to a page with retries and error handling."""
        if not self.page:
            self.errors.append("Page object is not initialized.")
            return False
        for attempt in range(retries):
            try:
                response = await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
                if response and response.ok:
                    await asyncio.sleep(REQUEST_DELAY)
                    return True
                else:
                    status = response.status if response else 'unknown'
                    logger.warning(f"HTTP {status} for {url}")
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for {url}: {str(e)}")
                if attempt < retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                else:
                    error_msg = f"Failed to navigate to {url} after {retries} attempts"
                    logger.error(error_msg)
                    self.errors.append(error_msg)
        return False

    async def safe_wait_for_selector(self, selector: str, timeout: int = 10000) -> bool:
        """Safely wait for a selector to appear on the page."""
        if not self.page:
            self.errors.append("Page object is not initialized.")
            return False
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            return True
        except Exception as e:
            logger.warning(f"Timeout waiting for selector '{selector}': {e}")
            return False

    async def scrape_jobs(self, search_params: Dict) -> List[JobData]:
        """Main scraping method."""
        try:
            logger.info(f"Starting job scraping for {self.source_name}")
            await asyncio.sleep(1 / self.rate_limit)
            jobs = await self._scrape_jobs_impl(search_params)
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
            if not job: continue
            job_hash = job.get_hash()
            if job_hash not in self.duplicate_hashes:
                self.duplicate_hashes.add(job_hash)
                unique_jobs.append(job)
            else:
                logger.debug(f"Duplicate job filtered: {job.title} at {job.company}")
        logger.info(f"Filtered {len(jobs) - len(unique_jobs)} duplicates from {self.source_name}")
        return unique_jobs
    
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
            'jobs_processed': len(self.jobs_found),
            'errors': self.errors,
            'error_count': len(self.errors),
            'status': 'success' if not self.errors else 'partial' if self.jobs_found else 'failed'
        }
    
    async def cleanup(self):
        """Clean up resources."""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info(f"Playwright session cleanup complete for {self.source_name}")
        except Exception as e:
            logger.error(f"Error during Playwright cleanup for {self.source_name}: {str(e)}")