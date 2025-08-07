"""
Job Scraper Orchestrator

This module orchestrates multiple job scrapers to collect jobs from various sources.
It provides error handling, retry logic, and aggregated results.
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.indeed_scraper import IndeedScraper
from scrapers.linkedin_scraper import LinkedInScraper
from scrapers.remote_ok_scraper import RemoteOKScraper
from scrapers.weworkremotely_scraper import WeWorkRemotelyScraper
from scrapers.company_scraper import CompanyScraper
from scrapers.base_scraper import JobData
from utils.duplicate_detector import DuplicateDetector

logger = logging.getLogger(__name__)

class ScraperOrchestrator:
    """Orchestrates multiple job scrapers."""
    
    def __init__(self, config: Dict = None):
        """
        Initialize the orchestrator.
        
        Args:
            config: Configuration dictionary with scraper settings
        """
        self.config = config or {}
        self.scrapers = {}
        self.duplicate_detector = DuplicateDetector()
        self.results = {
            'jobs': [],
            'stats': {},
            'errors': []
        }
        
        # Initialize scrapers based on config
        self._initialize_scrapers()
    
    def _initialize_scrapers(self):
        """Initialize all available scrapers."""
        try:
            # Standard job board scrapers
            if self.config.get('sources', {}).get('indeed', {}).get('enabled', True):
                self.scrapers['indeed'] = IndeedScraper()
                
            if self.config.get('sources', {}).get('linkedin', {}).get('enabled', True):
                self.scrapers['linkedin'] = LinkedInScraper()
                
            if self.config.get('sources', {}).get('remote_ok', {}).get('enabled', True):
                self.scrapers['remote_ok'] = RemoteOKScraper()
                
            if self.config.get('sources', {}).get('weworkremotely', {}).get('enabled', True):
                self.scrapers['weworkremotely'] = WeWorkRemotelyScraper()
            
            # Company scrapers
            company_configs = self.config.get('companies', [])
            for company_config in company_configs:
                if company_config.get('enabled', True):
                    company_name = company_config['name'].lower().replace(' ', '_')
                    self.scrapers[f'company_{company_name}'] = CompanyScraper(company_config)
            
            logger.info(f"Initialized {len(self.scrapers)} scrapers: {list(self.scrapers.keys())}")
            
        except Exception as e:
            logger.error(f"Failed to initialize scrapers: {str(e)}")
            raise
    
    async def scrape_all_sources(self, search_params: Dict) -> Dict:
        """
        Scrape jobs from all configured sources.
        
        Args:
            search_params: Search parameters for job scraping
            
        Returns:
            Dictionary containing aggregated results and statistics
        """
        logger.info(f"Starting job scraping with {len(self.scrapers)} sources")
        start_time = datetime.now()
        
        # Reset results
        self.results = {
            'jobs': [],
            'stats': {},
            'errors': []
        }
        
        # Run scrapers concurrently
        scraping_tasks = []
        for source_name, scraper in self.scrapers.items():
            task = self._scrape_source_with_error_handling(source_name, scraper, search_params)
            scraping_tasks.append(task)
        
        # Wait for all scrapers to complete
        scraper_results = await asyncio.gather(*scraping_tasks, return_exceptions=True)
        
        # Process results
        all_jobs = []
        for i, result in enumerate(scraper_results):
            source_name = list(self.scrapers.keys())[i]
            
            if isinstance(result, Exception):
                error_msg = f"Scraper {source_name} failed: {str(result)}"
                logger.error(error_msg)
                self.results['errors'].append(error_msg)
                self.results['stats'][source_name] = {
                    'status': 'failed',
                    'jobs_found': 0,
                    'error': str(result)
                }
            else:
                jobs, stats = result
                all_jobs.extend(jobs)
                self.results['stats'][source_name] = stats
        
        # Remove duplicates
        unique_jobs = self.duplicate_detector.remove_duplicates(all_jobs)
        duplicates_removed = len(all_jobs) - len(unique_jobs)
        
        # Store final results
        self.results['jobs'] = unique_jobs
        self.results['summary'] = {
            'total_jobs_found': len(all_jobs),
            'unique_jobs': len(unique_jobs),
            'duplicates_removed': duplicates_removed,
            'sources_scraped': len(self.scrapers),
            'sources_successful': len([s for s in self.results['stats'].values() if s.get('status') != 'failed']),
            'total_errors': len(self.results['errors']),
            'scraping_duration': (datetime.now() - start_time).total_seconds()
        }
        
        logger.info(f"Scraping complete: {len(unique_jobs)} unique jobs from {len(self.scrapers)} sources")
        return self.results
    
    async def _scrape_source_with_error_handling(self, source_name: str, scraper, search_params: Dict):
        """
        Scrape a single source with error handling and retries.
        
        Args:
            source_name: Name of the scraper source
            scraper: Scraper instance
            search_params: Search parameters
            
        Returns:
            Tuple of (jobs, stats) or raises exception
        """
        max_retries = self.config.get('max_retries', 2)
        retry_delay = self.config.get('retry_delay', 5)
        
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Scraping {source_name} (attempt {attempt + 1}/{max_retries + 1})")
                
                async with scraper:
                    jobs = await scraper.scrape_jobs(search_params)
                    stats = scraper.get_execution_stats()
                    
                    logger.info(f"{source_name} completed: {len(jobs)} jobs found")
                    return jobs, stats
                    
            except Exception as e:
                logger.warning(f"{source_name} attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries:
                    logger.info(f"Retrying {source_name} in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                else:
                    logger.error(f"{source_name} failed after {max_retries + 1} attempts")
                    raise e
    
    def get_jobs_by_source(self) -> Dict[str, List[JobData]]:
        """Get jobs grouped by source."""
        jobs_by_source = {}
        
        for job in self.results['jobs']:
            source = job.source
            if source not in jobs_by_source:
                jobs_by_source[source] = []
            jobs_by_source[source].append(job)
        
        return jobs_by_source
    
    def get_top_companies(self, limit: int = 10) -> List[Dict]:
        """Get top companies by job count."""
        company_counts = {}
        
        for job in self.results['jobs']:
            company = job.company
            if company not in company_counts:
                company_counts[company] = 0
            company_counts[company] += 1
        
        # Sort by count and return top companies
        sorted_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {'company': company, 'job_count': count}
            for company, count in sorted_companies[:limit]
        ]
    
    def get_remote_jobs_percentage(self) -> float:
        """Get percentage of remote jobs."""
        if not self.results['jobs']:
            return 0.0
        
        remote_count = sum(1 for job in self.results['jobs'] if job.remote)
        return (remote_count / len(self.results['jobs'])) * 100
    
    def export_results_to_dict(self) -> Dict:
        """Export all results to a dictionary format suitable for API responses."""
        return {
            'jobs': [job.to_dict() for job in self.results['jobs']],
            'summary': self.results['summary'],
            'stats': self.results['stats'],
            'errors': self.results['errors'],
            'analysis': {
                'jobs_by_source': {
                    source: len(jobs) for source, jobs in self.get_jobs_by_source().items()
                },
                'top_companies': self.get_top_companies(),
                'remote_jobs_percentage': self.get_remote_jobs_percentage()
            }
        }

# Example usage and configuration
DEFAULT_CONFIG = {
    'sources': {
        'indeed': {'enabled': True},
        'linkedin': {'enabled': True},
        'remote_ok': {'enabled': True},
        'weworkremotely': {'enabled': True}
    },
    'companies': [
        {
            'name': 'Google',
            'careers_url': 'https://careers.google.com/jobs/results/',
            'enabled': False,  # Disabled by default as it requires specific selectors
            'selectors': {
                'job_container': ['.gc-card'],
                'title': ['.gc-card__title'],
                'location': ['.gc-card__location'],
                'department': ['.gc-card__department'],
                'description': ['.gc-card__description'],
                'link': ['a']
            }
        }
    ],
    'max_retries': 2,
    'retry_delay': 5
}

async def main():
    """Example usage of the scraper orchestrator."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Search parameters
    search_params = {
        'job_titles': ['Software Engineer', 'Python Developer'],
        'keywords': ['Python', 'Django', 'FastAPI'],
        'locations': ['Remote', 'San Francisco'],
        'remote_ok': True,
        'job_type': 'full-time',
        'days_back': 7,
        'max_pages': 2
    }
    
    # Initialize orchestrator
    orchestrator = ScraperOrchestrator(DEFAULT_CONFIG)
    
    try:
        # Run scraping
        results = await orchestrator.scrape_all_sources(search_params)
        
        # Print summary
        summary = results['summary']
        print(f"\n=== Scraping Results ===")
        print(f"Total jobs found: {summary['total_jobs_found']}")
        print(f"Unique jobs: {summary['unique_jobs']}")
        print(f"Duplicates removed: {summary['duplicates_removed']}")
        print(f"Sources scraped: {summary['sources_scraped']}")
        print(f"Successful sources: {summary['sources_successful']}")
        print(f"Total errors: {summary['total_errors']}")
        print(f"Scraping duration: {summary['scraping_duration']:.2f} seconds")
        
        # Print top companies
        print(f"\n=== Top Companies ===")
        for company_info in orchestrator.get_top_companies(5):
            print(f"{company_info['company']}: {company_info['job_count']} jobs")
        
        # Print remote jobs percentage
        print(f"\nRemote jobs: {orchestrator.get_remote_jobs_percentage():.1f}%")
        
        # Print jobs by source
        print(f"\n=== Jobs by Source ===")
        for source, jobs in orchestrator.get_jobs_by_source().items():
            print(f"{source}: {len(jobs)} jobs")
        
    except Exception as e:
        logger.error(f"Scraping failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())