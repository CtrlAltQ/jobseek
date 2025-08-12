"""
LinkedIn Jobs Scraper

This module implements job scraping functionality for LinkedIn Jobs.
It handles authentication, search queries, and job data extraction.
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

class LinkedInScraper(BaseJobScraper):
    """LinkedIn Jobs scraper implementation."""
    
    def __init__(self):
        super().__init__(
            source_name="linkedin",
            base_url="https://www.linkedin.com",
            rate_limit=0.5  # 0.5 requests per second (more conservative)
        )
        self.jobs_url = f"{self.base_url}/jobs/search"
    
    async def _scrape_jobs_impl(self, search_params: Dict) -> List[JobData]:
        """Implement LinkedIn-specific job scraping."""
        jobs = []
        
        try:
            # Build search URL
            search_url = self._build_search_url(search_params)
            logger.info(f"Starting LinkedIn search: {search_url}")
            
            # Navigate to search results
            if not await self.safe_page_goto(search_url):
                return jobs
            
            # Handle LinkedIn's authentication/login prompts
            await self._handle_auth_prompts()
            
            # Extract jobs from current page
            page_jobs = await self._extract_jobs_from_page()
            jobs.extend(page_jobs)
            
            # Handle pagination if needed
            max_pages = search_params.get('max_pages', 2)  # LinkedIn is more restrictive
            current_page = 1
            
            while current_page < max_pages:
                if not await self._load_more_jobs():
                    break
                
                logger.info(f"Loading more LinkedIn jobs (page {current_page + 1})")
                
                # Wait for new jobs to load
                await asyncio.sleep(3)
                
                # Extract newly loaded jobs
                new_jobs = await self._extract_jobs_from_page()
                
                # Check if we got new jobs (to avoid infinite loop)
                if len(new_jobs) <= len(jobs):
                    break
                
                jobs = new_jobs  # Update with all jobs found so far
                current_page += 1
                
                # Rate limiting between pages
                await asyncio.sleep(4)
            
            logger.info(f"LinkedIn scraping complete: {len(jobs)} jobs found")
            return jobs
            
        except Exception as e:
            error_msg = f"LinkedIn scraping failed: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return jobs
    
    def _build_search_url(self, search_params: Dict) -> str:
        """Build LinkedIn search URL from parameters."""
        params = {}
        
        # Job query
        query_parts = []
        if search_params.get('job_titles'):
            query_parts.extend(search_params['job_titles'])
        if search_params.get('keywords'):
            query_parts.extend(search_params['keywords'])
        
        if query_parts:
            params['keywords'] = ' OR '.join(query_parts)
        
        # Location
        if search_params.get('locations'):
            params['location'] = search_params['locations'][0]  # Use first location
        
        # Remote jobs
        if search_params.get('remote_ok', False):
            params['f_WT'] = '2'  # Remote work type
        
        # Job type
        job_type_map = {
            'full-time': 'F',
            'part-time': 'P',
            'contract': 'C',
            'internship': 'I'
        }
        if search_params.get('job_type') in job_type_map:
            params['f_JT'] = job_type_map[search_params['job_type']]
        
        # Date posted
        date_map = {
            1: 'r86400',    # Past 24 hours
            7: 'r604800',   # Past week
            30: 'r2592000'  # Past month
        }
        days_back = search_params.get('days_back', 7)
        if days_back in date_map:
            params['f_TPR'] = date_map[days_back]
        
        # Sort by most recent
        params['sortBy'] = 'DD'
        
        return f"{self.jobs_url}?{urlencode(params)}"
    
    async def _handle_auth_prompts(self):
        """Handle LinkedIn's authentication and login prompts."""
        try:
            # Wait for page to load
            await asyncio.sleep(2)
            
            # Check for login wall
            login_form = await self.page.query_selector('form[data-id="sign-in-form"]')
            if login_form:
                logger.warning("LinkedIn login wall detected - continuing without authentication")
                # Try to find "Continue as guest" or similar option
                guest_button = await self.page.query_selector('[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]')
                if guest_button:
                    await guest_button.click()
                    await asyncio.sleep(2)
            
            # Handle cookie consent
            cookie_accept = await self.page.query_selector('[data-id="accept-cookies"]')
            if cookie_accept:
                await cookie_accept.click()
                await asyncio.sleep(1)
            
            # Wait for job results to load
            await self.safe_wait_for_selector('.jobs-search__results-list', timeout=15000)
            
        except Exception as e:
            logger.debug(f"Auth prompt handling failed: {str(e)}")
    
    async def _extract_jobs_from_page(self) -> List[JobData]:
        """Extract job data from current LinkedIn page."""
        jobs = []
        
        try:
            # Wait for job cards to load
            if not await self.safe_wait_for_selector('.job-search-card', timeout=10000):
                logger.warning("No job cards found on LinkedIn page")
                return jobs
            
            # Get all job cards
            job_cards = await self.page.query_selector_all('.job-search-card')
            logger.info(f"Found {len(job_cards)} job cards on LinkedIn page")
            
            for card in job_cards:
                try:
                    job_data = await self._extract_job_from_card(card)
                    if job_data:
                        jobs.append(job_data)
                except Exception as e:
                    logger.debug(f"Failed to extract job from LinkedIn card: {str(e)}")
                    continue
            
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to extract jobs from LinkedIn page: {str(e)}")
            return jobs
    
    async def _extract_job_from_card(self, card) -> Optional[JobData]:
        """Extract job data from a single LinkedIn job card."""
        try:
            # Extract title and URL
            title_element = await card.query_selector('.base-search-card__title a')
            if not title_element:
                return None
            
            title = await title_element.text_content()
            title = title.strip() if title else ""
            
            job_url = await title_element.get_attribute('href')
            if job_url:
                job_url = urljoin(self.base_url, job_url)
            
            # Extract company
            company_element = await card.query_selector('.base-search-card__subtitle a')
            company = ""
            if company_element:
                company = await company_element.text_content()
                company = company.strip() if company else ""
            
            # Extract location
            location_element = await card.query_selector('.job-search-card__location')
            location = ""
            if location_element:
                location = await location_element.text_content()
                location = location.strip() if location else ""
            
            # Extract job snippet/description
            snippet_element = await card.query_selector('.job-search-card__snippet')
            description = ""
            if snippet_element:
                description = await snippet_element.text_content()
                description = description.strip() if description else ""
            
            # Extract posted date
            date_element = await card.query_selector('.job-search-card__listdate')
            posted_date = datetime.now()
            if date_element:
                date_text = await date_element.text_content()
                posted_date = self._parse_posted_date(date_text)
            
            # Extract salary if available (LinkedIn doesn't always show salary)
            salary_element = await card.query_selector('.job-search-card__salary-info')
            salary_text = ""
            if salary_element:
                salary_text = await salary_element.text_content()
                salary_text = salary_text.strip() if salary_text else ""
            
            # Parse salary
            salary_info = JobDataProcessor.parse_salary(salary_text)
            
            # Determine if remote
            is_remote = JobDataProcessor.detect_remote_work(f"{title} {description} {location}")
            
            # Skip if missing critical information
            if not title or not company or not job_url:
                logger.debug(f"Skipping LinkedIn job with missing critical info: title='{title}', company='{company}', url='{job_url}'")
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
            logger.debug(f"Failed to extract job data from LinkedIn card: {str(e)}")
            return None
    
    def _parse_posted_date(self, date_text: str) -> datetime:
        """Parse LinkedIn's posted date format."""
        if not date_text:
            return datetime.now()
        
        date_text = date_text.lower().strip()
        now = datetime.now()
        
        try:
            if 'just now' in date_text or 'today' in date_text:
                return now
            elif 'yesterday' in date_text:
                return now - timedelta(days=1)
            elif 'day' in date_text and 'ago' in date_text:
                days_match = re.search(r'(\d+)\s*days?\s*ago', date_text)
                if days_match:
                    days = int(days_match.group(1))
                    return now - timedelta(days=days)
            elif 'hour' in date_text and 'ago' in date_text:
                hours_match = re.search(r'(\d+)\s*hours?\s*ago', date_text)
                if hours_match:
                    hours = int(hours_match.group(1))
                    return now - timedelta(hours=hours)
            elif 'week' in date_text and 'ago' in date_text:
                weeks_match = re.search(r'(\d+)\s*weeks?\s*ago', date_text)
                if weeks_match:
                    weeks = int(weeks_match.group(1))
                    return now - timedelta(weeks=weeks)
            elif 'month' in date_text and 'ago' in date_text:
                months_match = re.search(r'(\d+)\s*months?\s*ago', date_text)
                if months_match:
                    months = int(months_match.group(1))
                    return now - timedelta(days=months * 30)
        except (ValueError, AttributeError):
            pass
        
        return now
    
    async def _load_more_jobs(self) -> bool:
        """Load more jobs by scrolling or clicking 'Show more' button."""
        try:
            # First try to find and click "Show more jobs" button
            show_more_button = await self.page.query_selector('[data-tracking-control-name="infinite-scroller_show-more"]')
            if show_more_button:
                await show_more_button.click()
                await asyncio.sleep(3)
                return True
            
            # Alternative: scroll to bottom to trigger infinite scroll
            await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            await asyncio.sleep(2)
            
            # Check if new content loaded
            new_cards = await self.page.query_selector_all('.job-search-card')
            return len(new_cards) > 0
            
        except Exception as e:
            logger.debug(f"Failed to load more LinkedIn jobs: {str(e)}")
            return False