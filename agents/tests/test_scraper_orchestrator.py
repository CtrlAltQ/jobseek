"""
Tests for Scraper Orchestrator

This module contains integration tests for the scraper orchestrator functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.scraper_orchestrator import ScraperOrchestrator, DEFAULT_CONFIG
from scrapers.base_scraper import JobData

class TestScraperOrchestrator:
    """Test ScraperOrchestrator functionality."""
    
    @pytest.fixture
    def orchestrator(self):
        """Create a scraper orchestrator instance."""
        config = {
            'sources': {
                'indeed': {'enabled': True},
                'linkedin': {'enabled': False}  # Disable some for testing
            },
            'companies': [],
            'max_retries': 1,
            'retry_delay': 0.1
        }
        return ScraperOrchestrator(config)
    
    def test_orchestrator_initialization(self, orchestrator):
        """Test orchestrator initialization."""
        # The orchestrator initializes all enabled scrapers by default
        # Our config only disables LinkedIn, so we should have Indeed, RemoteOK, and WeWorkRemotely
        assert len(orchestrator.scrapers) >= 1  # At least Indeed enabled
        assert 'indeed' in orchestrator.scrapers
        assert 'linkedin' not in orchestrator.scrapers
        assert orchestrator.config['max_retries'] == 1
    
    def test_orchestrator_initialization_with_companies(self):
        """Test orchestrator initialization with company scrapers."""
        config = {
            'sources': {},
            'companies': [
                {
                    'name': 'Test Company',
                    'careers_url': 'https://test.com/careers',
                    'enabled': True
                }
            ]
        }
        
        orchestrator = ScraperOrchestrator(config)
        assert 'company_test_company' in orchestrator.scrapers
    
    def test_get_jobs_by_source(self, orchestrator):
        """Test grouping jobs by source."""
        # Add mock jobs to results
        orchestrator.results['jobs'] = [
            JobData(
                title="Job 1",
                company="Company 1",
                location="Location 1",
                description="Description 1",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source="indeed",
                source_url="https://indeed.com/job/1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Job 2",
                company="Company 2",
                location="Location 2",
                description="Description 2",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,
                source="linkedin",
                source_url="https://linkedin.com/job/2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Job 3",
                company="Company 1",
                location="Location 3",
                description="Description 3",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source="indeed",
                source_url="https://indeed.com/job/3",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        jobs_by_source = orchestrator.get_jobs_by_source()
        
        assert len(jobs_by_source) == 2
        assert len(jobs_by_source['indeed']) == 2
        assert len(jobs_by_source['linkedin']) == 1
    
    def test_get_top_companies(self, orchestrator):
        """Test getting top companies by job count."""
        # Add mock jobs to results
        orchestrator.results['jobs'] = [
            JobData(
                title="Job 1",
                company="Company A",
                location="Location 1",
                description="Description 1",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source="indeed",
                source_url="https://indeed.com/job/1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Job 2",
                company="Company A",
                location="Location 2",
                description="Description 2",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source="indeed",
                source_url="https://indeed.com/job/2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Job 3",
                company="Company B",
                location="Location 3",
                description="Description 3",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source="linkedin",
                source_url="https://linkedin.com/job/3",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        top_companies = orchestrator.get_top_companies(2)
        
        assert len(top_companies) == 2
        assert top_companies[0]['company'] == 'Company A'
        assert top_companies[0]['job_count'] == 2
        assert top_companies[1]['company'] == 'Company B'
        assert top_companies[1]['job_count'] == 1
    
    def test_get_remote_jobs_percentage(self, orchestrator):
        """Test calculating remote jobs percentage."""
        # Add mock jobs to results
        orchestrator.results['jobs'] = [
            JobData(
                title="Job 1",
                company="Company 1",
                location="Remote",
                description="Description 1",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,  # Remote
                source="indeed",
                source_url="https://indeed.com/job/1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Job 2",
                company="Company 2",
                location="New York",
                description="Description 2",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,  # Not remote
                source="linkedin",
                source_url="https://linkedin.com/job/2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Job 3",
                company="Company 3",
                location="Remote",
                description="Description 3",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,  # Remote
                source="remote_ok",
                source_url="https://remoteok.io/job/3",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        percentage = orchestrator.get_remote_jobs_percentage()
        
        assert abs(percentage - 66.67) < 0.1  # 2 out of 3 jobs are remote (approximately 66.67%)
    
    def test_get_remote_jobs_percentage_no_jobs(self, orchestrator):
        """Test calculating remote jobs percentage with no jobs."""
        orchestrator.results['jobs'] = []
        
        percentage = orchestrator.get_remote_jobs_percentage()
        
        assert percentage == 0.0
    
    def test_export_results_to_dict(self, orchestrator):
        """Test exporting results to dictionary format."""
        # Set up mock results
        orchestrator.results = {
            'jobs': [
                JobData(
                    title="Test Job",
                    company="Test Company",
                    location="Remote",
                    description="Test Description",
                    requirements=["Python"],
                    benefits=["Health"],
                    job_type="full-time",
                    remote=True,
                    source="indeed",
                    source_url="https://indeed.com/job/1",
                    posted_date=datetime.now(),
                    discovered_date=datetime.now()
                )
            ],
            'summary': {
                'total_jobs_found': 1,
                'unique_jobs': 1,
                'duplicates_removed': 0
            },
            'stats': {
                'indeed': {'status': 'success', 'jobs_found': 1}
            },
            'errors': []
        }
        
        exported = orchestrator.export_results_to_dict()
        
        assert 'jobs' in exported
        assert 'summary' in exported
        assert 'stats' in exported
        assert 'errors' in exported
        assert 'analysis' in exported
        
        assert len(exported['jobs']) == 1
        assert exported['jobs'][0]['title'] == "Test Job"
        assert exported['analysis']['jobs_by_source']['indeed'] == 1
        assert exported['analysis']['remote_jobs_percentage'] == 100.0
    
    @pytest.mark.asyncio
    async def test_scrape_source_with_error_handling_success(self, orchestrator):
        """Test successful source scraping with error handling."""
        # Mock scraper
        mock_scraper = AsyncMock()
        mock_scraper.__aenter__ = AsyncMock(return_value=mock_scraper)
        mock_scraper.__aexit__ = AsyncMock(return_value=None)
        
        # Mock successful scraping
        mock_jobs = [
            JobData(
                title="Test Job",
                company="Test Company",
                location="Remote",
                description="Test Description",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,
                source="test",
                source_url="https://test.com/job/1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        mock_scraper.scrape_jobs.return_value = mock_jobs
        mock_scraper.get_execution_stats = Mock(return_value={
            'status': 'success',
            'jobs_found': 1,
            'errors': []
        })
        
        search_params = {'job_titles': ['Engineer']}
        
        jobs, stats = await orchestrator._scrape_source_with_error_handling(
            'test_source', mock_scraper, search_params
        )
        
        assert len(jobs) == 1
        assert jobs[0].title == "Test Job"
        assert stats['status'] == 'success'
    
    @pytest.mark.asyncio
    async def test_scrape_source_with_error_handling_retry(self, orchestrator):
        """Test source scraping with retry on failure."""
        # Mock scraper that fails first time, succeeds second time
        mock_scraper = AsyncMock()
        mock_scraper.__aenter__ = AsyncMock(return_value=mock_scraper)
        mock_scraper.__aexit__ = AsyncMock(return_value=None)
        
        # First call fails, second succeeds
        mock_scraper.scrape_jobs.side_effect = [
            Exception("Network error"),  # First attempt fails
            []  # Second attempt succeeds with empty results
        ]
        mock_scraper.get_execution_stats = Mock(return_value={
            'status': 'success',
            'jobs_found': 0,
            'errors': []
        })
        
        search_params = {'job_titles': ['Engineer']}
        
        jobs, stats = await orchestrator._scrape_source_with_error_handling(
            'test_source', mock_scraper, search_params
        )
        
        assert len(jobs) == 0
        assert stats['status'] == 'success'
        assert mock_scraper.scrape_jobs.call_count == 2  # Called twice due to retry
    
    @pytest.mark.asyncio
    async def test_scrape_source_with_error_handling_max_retries(self, orchestrator):
        """Test source scraping that fails after max retries."""
        # Mock scraper that always fails
        mock_scraper = AsyncMock()
        mock_scraper.__aenter__ = AsyncMock(return_value=mock_scraper)
        mock_scraper.__aexit__ = AsyncMock(return_value=None)
        
        mock_scraper.scrape_jobs.side_effect = Exception("Persistent error")
        
        search_params = {'job_titles': ['Engineer']}
        
        with pytest.raises(Exception, match="Persistent error"):
            await orchestrator._scrape_source_with_error_handling(
                'test_source', mock_scraper, search_params
            )
        
        # Should be called max_retries + 1 times (1 initial + 1 retry)
        assert mock_scraper.scrape_jobs.call_count == 2

if __name__ == "__main__":
    pytest.main([__file__])