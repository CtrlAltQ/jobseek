"""
Indeed.com Job Scraper

This module implements job scraping functionality for Indeed.com.
It handles search queries, pagination, and job data extraction.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from urllib.parse import urlencode, urljoin
import re

from agents.scrapers.base_scraper import BaseJobScraper, JobData
from agents.utils.data_utils import JobDataProcessor

logger = logging.getLogger(__name__)

class IndeedScraper(BaseJobScraper):
    """Indeed.com job scraper implementation."""
    
    def __init__(self):
        super().__init__(
            source_name="indeed",
            base_url="https://www.indeed.com",
            rate_limit=1.0  # 1 request per second
        )
        self.search_url = f"{self.base_url}/jobs"
    
    async def _scrape_jobs_impl(self, search_params: Dict) -> List[JobData]:
        """Implement Indeed-specific job scraping."""
        jobs = []
        
        try:
            # Build search URL
            search_url = self._build_search_url(search_params)
            logger.info(f"Starting Indeed search: {search_url}")
            
            # Navigate to search results
            if not await self.safe_page_goto(search_url):
                return jobs
            
            # Handle potential bot detection
            await self._handle_bot_detection()
            
            # Extract jobs from current page
            page_jobs = await self._extract_jobs_from_page()
            jobs.extend(page_jobs)
            
            # Handle pagination if needed
            max_pages = search_params.get('max_pages', 3)
            current_page = 1
            
            while current_page < max_pages:
                next_page_url = await self._get_next_page_url()
                if not next_page_url:
                    break
                
                logger.info(f"Scraping Indeed page {current_page + 1}")
                
                if not await self.safe_page_goto(next_page_url):
                    break
                
                await self._handle_bot_detection()
                page_jobs = await self._extract_jobs_from_page()
                jobs.extend(page_jobs)
                
                current_page += 1
                
                # Rate limiting between pages
                await asyncio.sleep(2)
            
            logger.info(f"Indeed scraping complete: {len(jobs)} jobs found")
            return jobs
            
        except Exception as e:
            error_msg = f"Indeed scraping failed: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return jobs
    
    def _build_search_url(self, search_params: Dict) -> str:
        """Build Indeed search URL from parameters."""
        params = {}
        
        # Job query
        query_parts = []
        if search_params.get('job_titles'):
            query_parts.extend(search_params['job_titles'])
        if search_params.get('keywords'):
            query_parts.extend(search_params['keywords'])
        
        if query_parts:
            params['q'] = ' OR '.join(f'"{title}"' for title in query_parts)
        
        # Location
        if search_params.get('locations'):
            params['l'] = search_params['locations'][0]  # Use first location
        
        # Remote jobs
        if search_params.get('remote_ok', False):
            params['remotejob'] = '032b3046-06a3-4876-8dfd-474eb5e7ed11'
        
        # Job type
        job_type_map = {
            'full-time': 'fulltime',
            'part-time': 'parttime',
            'contract': 'contract',
            'internship': 'internship'
        }
        if search_params.get('job_type') in job_type_map:
            params['jt'] = job_type_map[search_params['job_type']]
        
        # Date posted (last 7 days by default)
        params['fromage'] = search_params.get('days_back', 7)
        
        # Sort by date
        params['sort'] = 'date'
        
        return f"{self.search_url}?{urlencode(params)}"
    
    async def _handle_bot_detection(self):
        """Handle Indeed's bot detection mechanisms."""
        try:
            # Check for CAPTCHA or bot detection page
            page_content = await self.page.content()
            
            if 'blocked' in page_content.lower() or 'captcha' in page_content.lower():
                logger.warning("Indeed bot detection triggered")
                # Wait longer and try to continue
                await asyncio.sleep(5)
                return
            
            # Check for consent/cookie banner
            consent_button = await self.page.query_selector('[data-testid="consent-banner-accept-button"]')
            if consent_button:
                await consent_button.click()
                await asyncio.sleep(1)
            
            # Wait for job results to load
            await self.safe_wait_for_selector('[data-testid="job-title"]', timeout=15000)
            
        except Exception as e:
            logger.debug(f"Bot detection handling failed: {str(e)}")
    
    async def _extract_jobs_from_page(self) -> List[JobData]:
        """Extract job data from current Indeed page."""
        jobs = []
        
        try:
            # Wait for job cards to load
            if not await self.safe_wait_for_selector('[data-testid="slider_item"]', timeout=10000):
                logger.warning("No job cards found on Indeed page")
                return jobs
            
            # Get all job cards
            job_cards = await self.page.query_selector_all('[data-testid="slider_item"]')
            logger.info(f"Found {len(job_cards)} job cards on Indeed page")
            
            for card in job_cards:
                try:
                    job_data = await self._extract_job_from_card(card)
                    if job_data:
                        jobs.append(job_data)
                except Exception as e:
                    logger.debug(f"Failed to extract job from card: {str(e)}")
                    continue
            
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to extract jobs from Indeed page: {str(e)}")
            return jobs
    
    async def _extract_job_from_card(self, card) -> Optional[JobData]:
        """Extract job data from a single Indeed job card."""
        try:
            # Extract title and URL
            title_element = await card.query_selector('[data-testid="job-title"] a')
            if not title_element:
                return None
            
            title = await title_element.text_content()
            title = title.strip() if title else ""
            
            job_url = await title_element.get_attribute('href')
            if job_url:
                job_url = urljoin(self.base_url, job_url)
            
            # Extract company
            company_element = await card.query_selector('[data-testid="company-name"]')
            company = ""
            if company_element:
                company = await company_element.text_content()
                company = company.strip() if company else ""
            
            # Extract location
            location_element = await card.query_selector('[data-testid="job-location"]')
            location = ""
            if location_element:
                location = await location_element.text_content()
                location = location.strip() if location else ""
            
            # Extract salary if available
            salary_element = await card.query_selector('[data-testid="attribute_snippet_testid"]')
            salary_text = ""
            if salary_element:
                salary_text = await salary_element.text_content()
                salary_text = salary_text.strip() if salary_text else ""
            
            # Parse salary
            salary_info = JobDataProcessor.parse_salary(salary_text)
            
            # Extract job snippet/description
            snippet_element = await card.query_selector('[data-testid="job-snippet"]')
            description = ""
            if snippet_element:
                description = await snippet_element.text_content()
                description = description.strip() if description else ""
            
            # Extract posted date
            date_element = await card.query_selector('[data-testid="myJobsStateDate"]')
            posted_date = datetime.now()
            if date_element:
                date_text = await date_element.text_content()
                posted_date = self._parse_posted_date(date_text)
            
            # Determine if remote
            is_remote = JobDataProcessor.detect_remote_work(f"{title} {description} {location}")
            
            # Skip if missing critical information
            if not title or not company or not job_url:
                logger.debug(f"Skipping job with missing critical info: title='{title}', company='{company}', url='{job_url}'")
                return None
            
            # Create JobData object
            job_data = JobData(
                title=JobDataProcessor.clean_text(title),
                company=JobDataProcessor.clean_text(company),
                location=JobDataProcessor.clean_text(location),
                description=JobDataProcessor.clean_text(description),
                requirements=[],  # Will be extracted from full description if needed
                benefits=[],  # Will be extracted from full description if needed
                job_type=JobDataProcessor.normalize_job_type(""),  # Default to full-time
                remote=is_remote,
                source=self.source_name,
                source_url=job_url,
                posted_date=posted_date,
                discovered_date=datetime.now(),
                salary_min=salary_info.min_salary,
                salary_max=salary_info.max_salary,
                salary_currency="USD"
            )
            
            return job_data
            
        except Exception as e:
            logger.debug(f"Failed to extract job data from Indeed card: {str(e)}")
            return None
    
    def _parse_posted_date(self, date_text: str) -> datetime:
        """Parse Indeed's posted date format."""
        if not date_text:
            return datetime.now()
        
        date_text = date_text.lower().strip()
        now = datetime.now()
        
        try:
            if 'today' in date_text or 'just posted' in date_text:
                return now
            elif 'yesterday' in date_text:
                return now - timedelta(days=1)
            elif 'days ago' in date_text:
                days_match = re.search(r'(\d+)\s*days?\s*ago', date_text)
                if days_match:
                    days = int(days_match.group(1))
                    return now - timedelta(days=days)
            elif 'hours ago' in date_text:
                hours_match = re.search(r'(\d+)\s*hours?\s*ago', date_text)
                if hours_match:
                    hours = int(hours_match.group(1))
                    return now - timedelta(hours=hours)
            elif 'week' in date_text:
                weeks_match = re.search(r'(\d+)\s*weeks?\s*ago', date_text)
                if weeks_match:
                    weeks = int(weeks_match.group(1))
                    return now - timedelta(weeks=weeks)
            elif 'month' in date_text:
                months_match = re.search(r'(\d+)\s*months?\s*ago', date_text)
                if months_match:
                    months = int(months_match.group(1))
                    return now - timedelta(days=months * 30)
        except (ValueError, AttributeError):
            pass
        
        return now
    
    async def _get_next_page_url(self) -> Optional[str]:
        """Get URL for next page of results."""
        try:
            next_button = await self.page.query_selector('a[aria-label="Next Page"]')
            if not next_button:
                return None
            
            next_url = await next_button.get_attribute('href')
            if next_url:
                return urljoin(self.base_url, next_url)
            
            return None
            
        except Exception as e:
            logger.debug(f"Failed to get next page URL: {str(e)}")
            return None