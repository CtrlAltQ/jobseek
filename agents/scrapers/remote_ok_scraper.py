"""
RemoteOK Job Scraper

This module implements job scraping functionality for RemoteOK.io.
It handles search queries and job data extraction for remote positions.
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

class RemoteOKScraper(BaseJobScraper):
    """RemoteOK.io job scraper implementation."""
    
    def __init__(self):
        super().__init__(
            source_name="remote_ok",
            base_url="https://remoteok.io",
            rate_limit=1.0  # 1 request per second
        )
    
    async def _scrape_jobs_impl(self, search_params: Dict) -> List[JobData]:
        """Implement RemoteOK-specific job scraping."""
        jobs = []
        
        try:
            # Build search URL
            search_url = self._build_search_url(search_params)
            logger.info(f"Starting RemoteOK search: {search_url}")
            
            # Navigate to search results
            if not await self.safe_page_goto(search_url):
                return jobs
            
            # Handle any popups or overlays
            await self._handle_popups()
            
            # Extract jobs from page
            jobs = await self._extract_jobs_from_page()
            
            logger.info(f"RemoteOK scraping complete: {len(jobs)} jobs found")
            return jobs
            
        except Exception as e:
            error_msg = f"RemoteOK scraping failed: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return jobs
    
    def _build_search_url(self, search_params: Dict) -> str:
        """Build RemoteOK search URL from parameters."""
        # RemoteOK uses a simple search format
        query_parts = []
        if search_params.get('job_titles'):
            query_parts.extend(search_params['job_titles'])
        if search_params.get('keywords'):
            query_parts.extend(search_params['keywords'])
        
        if query_parts:
            # RemoteOK uses tags in URL format
            search_term = '+'.join(query_parts[0].lower().split())
            return f"{self.base_url}/{search_term}"
        
        # Default to all jobs
        return self.base_url
    
    async def _handle_popups(self):
        """Handle RemoteOK popups and overlays."""
        try:
            # Wait for page to load
            await asyncio.sleep(2)
            
            # Close any newsletter signup popup
            close_popup = await self.page.query_selector('.close-popup, .modal-close, [data-dismiss="modal"]')
            if close_popup:
                await close_popup.click()
                await asyncio.sleep(1)
            
            # Wait for job table to load
            await self.safe_wait_for_selector('#jobsboard', timeout=10000)
            
        except Exception as e:
            logger.debug(f"Popup handling failed: {str(e)}")
    
    async def _extract_jobs_from_page(self) -> List[JobData]:
        """Extract job data from RemoteOK page."""
        jobs = []
        
        try:
            # Wait for job table to load
            if not await self.safe_wait_for_selector('#jobsboard tr.job', timeout=10000):
                logger.warning("No job rows found on RemoteOK page")
                return jobs
            
            # Get all job rows
            job_rows = await self.page.query_selector_all('#jobsboard tr.job')
            logger.info(f"Found {len(job_rows)} job rows on RemoteOK page")
            
            for row in job_rows:
                try:
                    job_data = await self._extract_job_from_row(row)
                    if job_data:
                        jobs.append(job_data)
                except Exception as e:
                    logger.debug(f"Failed to extract job from RemoteOK row: {str(e)}")
                    continue
            
            return jobs
            
        except Exception as e:
            logger.error(f"Failed to extract jobs from RemoteOK page: {str(e)}")
            return jobs
    
    async def _extract_job_from_row(self, row) -> Optional[JobData]:
        """Extract job data from a single RemoteOK job row."""
        try:
            # Extract job URL and ID
            job_link = await row.query_selector('td.company a')
            if not job_link:
                return None
            
            job_url = await job_link.get_attribute('href')
            if job_url:
                job_url = urljoin(self.base_url, job_url)
            
            # Extract title
            title_element = await row.query_selector('td.company h2')
            title = ""
            if title_element:
                title = await title_element.text_content()
                title = title.strip() if title else ""
            
            # Extract company
            company_element = await row.query_selector('td.company h3')
            company = ""
            if company_element:
                company = await company_element.text_content()
                company = company.strip() if company else ""
            
            # Extract location (usually "Worldwide" for RemoteOK)
            location = "Remote"
            
            # Extract tags/skills
            tag_elements = await row.query_selector_all('td.company .tags .tag')
            tags = []
            for tag_element in tag_elements:
                tag_text = await tag_element.text_content()
                if tag_text:
                    tags.append(tag_text.strip())
            
            # Use tags as requirements
            requirements = tags[:5]  # Limit to first 5 tags
            
            # Extract salary if available
            salary_element = await row.query_selector('td.company .salary')
            salary_text = ""
            if salary_element:
                salary_text = await salary_element.text_content()
                salary_text = salary_text.strip() if salary_text else ""
            
            # Parse salary
            salary_info = JobDataProcessor.parse_salary(salary_text)
            
            # Extract posted date
            date_element = await row.query_selector('td.time time')
            posted_date = datetime.now()
            if date_element:
                date_text = await date_element.text_content()
                posted_date = self._parse_posted_date(date_text)
            
            # Create description from available info
            description = f"Remote position at {company}"
            if tags:
                description += f". Required skills: {', '.join(tags[:3])}"
            
            # Skip if missing critical information
            if not title or not company or not job_url:
                logger.debug(f"Skipping RemoteOK job with missing critical info: title='{title}', company='{company}', url='{job_url}'")
                return None
            
            # Create JobData object
            job_data = JobData(
                title=JobDataProcessor.clean_text(title),
                company=JobDataProcessor.clean_text(company),
                location=location,
                description=JobDataProcessor.clean_text(description),
                requirements=requirements,
                benefits=[],
                job_type="full-time",  # RemoteOK mostly has full-time positions
                remote=True,  # All RemoteOK jobs are remote
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
            logger.debug(f"Failed to extract job data from RemoteOK row: {str(e)}")
            return None
    
    def _parse_posted_date(self, date_text: str) -> datetime:
        """Parse RemoteOK's posted date format."""
        if not date_text:
            return datetime.now()
        
        date_text = date_text.lower().strip()
        now = datetime.now()
        
        try:
            if 'now' in date_text or 'today' in date_text:
                return now
            elif 'yesterday' in date_text:
                return now - timedelta(days=1)
            elif 'd' in date_text:  # "2d ago" format
                days_match = re.search(r'(\d+)d', date_text)
                if days_match:
                    days = int(days_match.group(1))
                    return now - timedelta(days=days)
            elif 'h' in date_text:  # "5h ago" format
                hours_match = re.search(r'(\d+)h', date_text)
                if hours_match:
                    hours = int(hours_match.group(1))
                    return now - timedelta(hours=hours)
            elif 'w' in date_text:  # "1w ago" format
                weeks_match = re.search(r'(\d+)w', date_text)
                if weeks_match:
                    weeks = int(weeks_match.group(1))
                    return now - timedelta(weeks=weeks)
            elif 'm' in date_text:  # "2m ago" format
                months_match = re.search(r'(\d+)m', date_text)
                if months_match:
                    months = int(months_match.group(1))
                    return now - timedelta(days=months * 30)
        except (ValueError, AttributeError):
            pass
        
        return now