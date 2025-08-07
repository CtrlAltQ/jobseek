"""
WeWorkRemotely Job Scraper

This module implements job scraping functionality for WeWorkRemotely.com.
It handles search queries and job data extraction for remote positions.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from urllib.parse import urlencode, urljoin
import re

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.base_scraper import BaseJobScraper, JobData
from utils.data_utils import JobDataProcessor

logger = logging.getLogger(__name__)

class WeWorkRemotelyScraper(BaseJobScraper):
    """WeWorkRemotely.com job scraper implementation."""
    
    def __init__(self):
        super().__init__(
            source_name="weworkremotely",
            base_url="https://weworkremotely.com",
            rate_limit=1.0  # 1 request per second
        )
        self.jobs_url = f"{self.base_url}/remote-jobs"
    
    async def _scrape_jobs_impl(self, search_params: Dict) -> List[JobData]:
        """Implement WeWorkRemotely-specific job scraping."""
        jobs = []
        
        try:
            # Build search URL
            search_url = self._build_search_url(search_params)
            logger.info(f"Starting WeWorkRemotely search: {search_url}")
            
            # Navigate to search results
            if not await self.safe_page_goto(search_url):
                return jobs
            
            # Handle any popups or overlays
            await self._handle_popups()
            
            # Extract jobs from page
            jobs = await self._extract_jobs_from_page()
            
            logger.info(f"WeWorkRemotely scraping complete: {len(jobs)} jobs found")
            return jobs
            
        except Exception as e:
            error_msg = f"WeWorkRemotely scraping failed: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return jobs
    
    def _build_search_url(self, search_params: Dict) -> str:
        """Build WeWorkRemotely search URL from parameters."""
        # WeWorkRemotely has category-based browsing
        # For now, we'll use the general programming category
        
        # Check if we're looking for specific job types
        query_parts = []
        if search_params.get('job_titles'):
            query_parts.extend(search_params['job_titles'])
        if search_params.get('keywords'):
            query_parts.extend(search_params['keywords'])
        
        # Map common terms to WeWorkRemotely categories
        if query_parts:
            query_lower = ' '.join(query_parts).lower()
            if any(term in query_lower for term in ['developer', 'engineer', 'programming', 'software']):
                return f"{self.jobs_url}/programming"
            elif any(term in query_lower for term in ['design', 'ui', 'ux']):
                return f"{self.jobs_url}/design"
            elif any(term in query_lower for term in ['marketing', 'growth']):
                return f"{self.jobs_url}/marketing"
            elif any(term in query_lower for term in ['data', 'analyst', 'science']):
                return f"{self.jobs_url}/programming"  # Data jobs often in programming
        
        # Default to programming category
        return f"{self.jobs_url}/programming"
    
    async def _handle_popups(self):
        """Handle WeWorkRemotely popups and overlays."""
        try:
            # Wait for page to load
            await asyncio.sleep(2)
            
            # Close any newsletter signup or cookie banner
            close_buttons = await self.page.query_selector_all('.close, .dismiss, [data-dismiss]')
            for button in close_buttons:
                try:
                    await button.click()
                    await asyncio.sleep(0.5)
                except:
                    continue
            
            # Wait for job listings to load
            await self.safe_wait_for_selector('.jobs', timeout=10000)
            
        except Exception as e:
            logger.debug(f"Popup handling failed: {str(e)}")
    
    async def _extract_jobs_from_page(self) -> List[JobData]:
        """Extract job data from WeWorkRemotely page."""
        jobs = []
        
        try:
            # Wait for job listings to load
            if not await self.safe_wait_for_selector('.jobs li', timeout=10000):
                logger.warning("No job listings found on WeWorkRemotely page")
                return jobs
            
            # Get all job listings
            job_items = await self.page.query_selector_all('.jobs li')
            logger.info(f"Found {len(job_items)} job items on WeWorkRemotely page")
            
            for item in job_items:
                try:
                    # Skip category headers and ads
                    if await item.query_selector('.ad, .category'):
                        continue
                    
                    job_data = await self._extract_job_from_item(item)
                    if job_data:
                        jobs.append(job_data)
                except Exception as e:
                    logger.debug(f"Failed to extract job from WeWorkRemotely item: {str(e)}")
                    continue
            
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to extract jobs from WeWorkRemotely page: {str(e)}")
            return jobs
    
    async def _extract_job_from_item(self, item) -> Optional[JobData]:
        """Extract job data from a single WeWorkRemotely job item."""
        try:
            # Extract job link
            job_link = await item.query_selector('a')
            if not job_link:
                return None
            
            job_url = await job_link.get_attribute('href')
            if job_url:
                job_url = urljoin(self.base_url, job_url)
            
            # Extract title and company from the link text
            link_text = await job_link.text_content()
            if not link_text:
                return None
            
            link_text = link_text.strip()
            
            # WeWorkRemotely format is usually "Company: Job Title"
            if ':' in link_text:
                parts = link_text.split(':', 1)
                company = parts[0].strip()
                title = parts[1].strip()
            else:
                # Fallback: try to extract from spans
                company_element = await item.query_selector('.company')
                title_element = await item.query_selector('.title')
                
                if company_element and title_element:
                    company = await company_element.text_content()
                    title = await title_element.text_content()
                    company = company.strip() if company else ""
                    title = title.strip() if title else ""
                else:
                    # Last resort: use the whole text as title
                    title = link_text
                    company = "Unknown"
            
            # Extract location (usually "Remote" for WeWorkRemotely)
            location = "Remote"
            
            # Extract any additional info from the item
            region_element = await item.query_selector('.region')
            if region_element:
                region_text = await region_element.text_content()
                if region_text and region_text.strip():
                    location = f"Remote ({region_text.strip()})"
            
            # Create basic description
            description = f"Remote position at {company}"
            
            # Extract posted date (WeWorkRemotely doesn't always show this clearly)
            posted_date = datetime.now()  # Default to now
            
            # Skip if missing critical information
            if not title or not company or not job_url:
                logger.debug(f"Skipping WeWorkRemotely job with missing critical info: title='{title}', company='{company}', url='{job_url}'")
                return None
            
            # Create JobData object
            job_data = JobData(
                title=JobDataProcessor.clean_text(title),
                company=JobDataProcessor.clean_text(company),
                location=location,
                description=JobDataProcessor.clean_text(description),
                requirements=[],  # Will need to visit job page for detailed requirements
                benefits=[],
                job_type="full-time",  # WeWorkRemotely mostly has full-time positions
                remote=True,  # All WeWorkRemotely jobs are remote
                source=self.source_name,
                source_url=job_url,
                posted_date=posted_date,
                discovered_date=datetime.now(),
                salary_min=None,  # WeWorkRemotely doesn't show salary in listings
                salary_max=None,
                salary_currency="USD"
            )
            
            return job_data
            
        except Exception as e:
            logger.debug(f"Failed to extract job data from WeWorkRemotely item: {str(e)}")
            return None