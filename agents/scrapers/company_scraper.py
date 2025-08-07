"""
Company Career Page Scraper

This module implements job scraping functionality for company career pages.
It handles various career page formats and job data extraction.
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse
import re

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.base_scraper import BaseJobScraper, JobData
from utils.data_utils import JobDataProcessor

logger = logging.getLogger(__name__)

class CompanyScraper(BaseJobScraper):
    """Company career page scraper implementation."""
    
    def __init__(self, company_config: Dict):
        """
        Initialize company scraper with specific configuration.
        
        Args:
            company_config: Dictionary containing:
                - name: Company name
                - careers_url: URL to careers page
                - selectors: CSS selectors for job elements
        """
        self.company_config = company_config
        company_name = company_config.get('name', 'unknown')
        
        super().__init__(
            source_name=f"company_{company_name.lower().replace(' ', '_')}",
            base_url=company_config.get('careers_url', ''),
            rate_limit=1.0
        )
        
        self.company_name = company_name
        self.selectors = company_config.get('selectors', self._get_default_selectors())
    
    def _get_default_selectors(self) -> Dict:
        """Get default CSS selectors for common career page patterns."""
        return {
            'job_container': [
                '.job-listing',
                '.job-item',
                '.career-item',
                '.position',
                '.opening',
                '[data-job]',
                '.job-card'
            ],
            'title': [
                '.job-title',
                '.title',
                'h2',
                'h3',
                '.position-title',
                '[data-job-title]'
            ],
            'location': [
                '.job-location',
                '.location',
                '.office',
                '.city',
                '[data-location]'
            ],
            'department': [
                '.department',
                '.team',
                '.category',
                '.job-category'
            ],
            'description': [
                '.job-description',
                '.description',
                '.summary',
                '.job-summary'
            ],
            'link': [
                'a',
                '[href]'
            ]
        }
    
    async def _scrape_jobs_impl(self, search_params: Dict) -> List[JobData]:
        """Implement company-specific job scraping."""
        jobs = []
        
        try:
            logger.info(f"Starting {self.company_name} career page scraping: {self.base_url}")
            
            # Navigate to careers page
            if not await self.safe_page_goto(self.base_url):
                return jobs
            
            # Handle any popups or cookie banners
            await self._handle_popups()
            
            # Try different strategies to find jobs
            jobs = await self._extract_jobs_with_fallback()
            
            # Filter jobs based on search parameters
            filtered_jobs = self._filter_jobs_by_criteria(jobs, search_params)
            
            logger.info(f"{self.company_name} scraping complete: {len(filtered_jobs)} jobs found")
            return filtered_jobs
            
        except Exception as e:
            error_msg = f"{self.company_name} scraping failed: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return jobs
    
    async def _handle_popups(self):
        """Handle common popups and overlays on career pages."""
        try:
            await asyncio.sleep(2)
            
            # Common popup close selectors
            popup_selectors = [
                '.modal-close',
                '.popup-close',
                '.close-button',
                '[data-dismiss="modal"]',
                '.cookie-accept',
                '.accept-cookies',
                '.gdpr-accept'
            ]
            
            for selector in popup_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        await element.click()
                        await asyncio.sleep(0.5)
                except:
                    continue
            
        except Exception as e:
            logger.debug(f"Popup handling failed: {str(e)}")
    
    async def _extract_jobs_with_fallback(self) -> List[JobData]:
        """Extract jobs using multiple strategies with fallback."""
        jobs = []
        
        # Strategy 1: Use configured selectors
        if self.selectors.get('job_container'):
            jobs = await self._extract_jobs_with_selectors()
            if jobs:
                logger.info(f"Found {len(jobs)} jobs using configured selectors")
                return jobs
        
        # Strategy 2: Try common job listing patterns
        jobs = await self._extract_jobs_with_common_patterns()
        if jobs:
            logger.info(f"Found {len(jobs)} jobs using common patterns")
            return jobs
        
        # Strategy 3: Look for links that might be job postings
        jobs = await self._extract_jobs_from_links()
        if jobs:
            logger.info(f"Found {len(jobs)} jobs from link analysis")
            return jobs
        
        logger.warning(f"No jobs found on {self.company_name} career page")
        return jobs
    
    async def _extract_jobs_with_selectors(self) -> List[JobData]:
        """Extract jobs using configured CSS selectors."""
        jobs = []
        
        try:
            # Try each job container selector
            for container_selector in self.selectors['job_container']:
                job_elements = await self.page.query_selector_all(container_selector)
                if job_elements:
                    logger.info(f"Found {len(job_elements)} job elements with selector: {container_selector}")
                    
                    for element in job_elements:
                        job_data = await self._extract_job_from_element(element)
                        if job_data:
                            jobs.append(job_data)
                    
                    break  # Use first successful selector
            
            return jobs
            
        except Exception as e:
            logger.debug(f"Selector-based extraction failed: {str(e)}")
            return jobs
    
    async def _extract_jobs_with_common_patterns(self) -> List[JobData]:
        """Extract jobs using common career page patterns."""
        jobs = []
        
        try:
            # Common patterns for job listings
            common_selectors = [
                'div[class*="job"]',
                'li[class*="job"]',
                'div[class*="career"]',
                'div[class*="position"]',
                'div[class*="opening"]',
                'tr[class*="job"]',
                '.careers-list li',
                '.jobs-list li',
                '.positions li'
            ]
            
            for selector in common_selectors:
                job_elements = await self.page.query_selector_all(selector)
                if job_elements and len(job_elements) > 1:  # Need multiple elements to be a list
                    logger.info(f"Found {len(job_elements)} job elements with pattern: {selector}")
                    
                    for element in job_elements:
                        job_data = await self._extract_job_from_element(element)
                        if job_data:
                            jobs.append(job_data)
                    
                    if jobs:
                        break  # Use first successful pattern
            
            return jobs
            
        except Exception as e:
            logger.debug(f"Pattern-based extraction failed: {str(e)}")
            return jobs
    
    async def _extract_jobs_from_links(self) -> List[JobData]:
        """Extract jobs by analyzing links on the page."""
        jobs = []
        
        try:
            # Look for links that might be job postings
            all_links = await self.page.query_selector_all('a[href]')
            
            job_links = []
            for link in all_links:
                href = await link.get_attribute('href')
                text = await link.text_content()
                
                if href and text and self._looks_like_job_link(href, text):
                    job_links.append((link, href, text))
            
            logger.info(f"Found {len(job_links)} potential job links")
            
            for link, href, text in job_links[:20]:  # Limit to first 20 to avoid overload
                job_data = await self._create_job_from_link(link, href, text)
                if job_data:
                    jobs.append(job_data)
            
            return jobs
            
        except Exception as e:
            logger.debug(f"Link-based extraction failed: {str(e)}")
            return jobs
    
    def _looks_like_job_link(self, href: str, text: str) -> bool:
        """Determine if a link looks like a job posting."""
        if not href or not text:
            return False
        
        # Skip common non-job links
        skip_patterns = [
            'mailto:', 'tel:', '#', 'javascript:',
            'facebook.com', 'twitter.com', 'linkedin.com',
            'instagram.com', 'youtube.com'
        ]
        
        for pattern in skip_patterns:
            if pattern in href.lower():
                return False
        
        # Look for job-related keywords in URL or text
        job_keywords = [
            'job', 'career', 'position', 'opening', 'role',
            'engineer', 'developer', 'manager', 'analyst',
            'designer', 'specialist', 'coordinator'
        ]
        
        combined_text = f"{href} {text}".lower()
        return any(keyword in combined_text for keyword in job_keywords)
    
    async def _extract_job_from_element(self, element) -> Optional[JobData]:
        """Extract job data from a job element."""
        try:
            # Extract title
            title = await self._extract_text_from_selectors(element, self.selectors['title'])
            if not title:
                return None
            
            # Extract location
            location = await self._extract_text_from_selectors(element, self.selectors['location'])
            if not location:
                location = "Not specified"
            
            # Extract department
            department = await self._extract_text_from_selectors(element, self.selectors['department'])
            
            # Extract description
            description = await self._extract_text_from_selectors(element, self.selectors['description'])
            if not description:
                description = f"{title} position at {self.company_name}"
            
            # Extract job URL
            job_url = await self._extract_job_url(element)
            if not job_url:
                job_url = self.base_url  # Fallback to careers page
            
            # Determine if remote
            is_remote = JobDataProcessor.detect_remote_work(f"{title} {description} {location}")
            
            # Create JobData object
            job_data = JobData(
                title=JobDataProcessor.clean_text(title),
                company=self.company_name,
                location=JobDataProcessor.clean_text(location),
                description=JobDataProcessor.clean_text(description),
                requirements=[],  # Would need to visit job page for detailed requirements
                benefits=[],
                job_type=JobDataProcessor.normalize_job_type(""),  # Default to full-time
                remote=is_remote,
                source=self.source_name,
                source_url=job_url,
                posted_date=datetime.now(),  # Company pages rarely show posted date
                discovered_date=datetime.now(),
                salary_min=None,  # Company pages rarely show salary
                salary_max=None,
                salary_currency="USD"
            )
            
            return job_data
            
        except Exception as e:
            logger.debug(f"Failed to extract job from element: {str(e)}")
            return None
    
    async def _create_job_from_link(self, link, href: str, text: str) -> Optional[JobData]:
        """Create job data from a job link."""
        try:
            # Clean up the title
            title = JobDataProcessor.clean_text(text)
            if len(title) < 3 or len(title) > 100:
                return None
            
            # Create full URL
            job_url = urljoin(self.base_url, href)
            
            # Create basic job data
            job_data = JobData(
                title=title,
                company=self.company_name,
                location="Not specified",
                description=f"{title} position at {self.company_name}",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source=self.source_name,
                source_url=job_url,
                posted_date=datetime.now(),
                discovered_date=datetime.now(),
                salary_min=None,
                salary_max=None,
                salary_currency="USD"
            )
            
            return job_data
            
        except Exception as e:
            logger.debug(f"Failed to create job from link: {str(e)}")
            return None
    
    async def _extract_text_from_selectors(self, element, selectors: List[str]) -> str:
        """Extract text using a list of CSS selectors."""
        for selector in selectors:
            try:
                target_element = await element.query_selector(selector)
                if target_element:
                    text = await target_element.text_content()
                    if text and text.strip():
                        return text.strip()
            except:
                continue
        return ""
    
    async def _extract_job_url(self, element) -> str:
        """Extract job URL from element."""
        try:
            # Try to find a link within the element
            link = await element.query_selector('a[href]')
            if link:
                href = await link.get_attribute('href')
                if href:
                    return urljoin(self.base_url, href)
            
            # Check if the element itself is a link
            href = await element.get_attribute('href')
            if href:
                return urljoin(self.base_url, href)
            
            return ""
            
        except Exception as e:
            logger.debug(f"Failed to extract job URL: {str(e)}")
            return ""
    
    def _filter_jobs_by_criteria(self, jobs: List[JobData], search_params: Dict) -> List[JobData]:
        """Filter jobs based on search criteria."""
        if not search_params:
            return jobs
        
        filtered_jobs = []
        
        for job in jobs:
            # Check job titles
            if search_params.get('job_titles'):
                title_match = any(
                    title.lower() in job.title.lower() 
                    for title in search_params['job_titles']
                )
                if not title_match:
                    continue
            
            # Check keywords
            if search_params.get('keywords'):
                keyword_match = any(
                    keyword.lower() in f"{job.title} {job.description}".lower()
                    for keyword in search_params['keywords']
                )
                if not keyword_match:
                    continue
            
            # Check remote preference
            if search_params.get('remote_ok', False) and not job.remote:
                continue
            
            filtered_jobs.append(job)
        
        return filtered_jobs