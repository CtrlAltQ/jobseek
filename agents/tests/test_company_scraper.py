"""
Tests for Company Career Page Scraper

This module contains integration tests for the company scraper functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.company_scraper import CompanyScraper
from scrapers.base_scraper import JobData

class TestCompanyScraper:
    """Test Company scraper functionality."""
    
    @pytest.fixture
    def company_config(self):
        """Create a sample company configuration."""
        return {
            'name': 'Test Company',
            'careers_url': 'https://testcompany.com/careers',
            'selectors': {
                'job_container': ['.job-listing'],
                'title': ['.job-title'],
                'location': ['.job-location'],
                'department': ['.department'],
                'description': ['.job-description'],
                'link': ['a']
            }
        }
    
    @pytest.fixture
    def scraper(self, company_config):
        """Create a company scraper instance."""
        return CompanyScraper(company_config)
    
    def test_scraper_initialization(self, scraper, company_config):
        """Test scraper initialization."""
        assert scraper.source_name == "company_test_company"
        assert scraper.base_url == "https://testcompany.com/careers"
        assert scraper.company_name == "Test Company"
        assert scraper.rate_limit == 1.0
        assert scraper.selectors == company_config['selectors']
    
    def test_scraper_initialization_with_defaults(self):
        """Test scraper initialization with default selectors."""
        config = {
            'name': 'Default Company',
            'careers_url': 'https://default.com/jobs'
        }
        
        scraper = CompanyScraper(config)
        
        assert scraper.source_name == "company_default_company"
        assert scraper.company_name == "Default Company"
        assert '.job-listing' in scraper.selectors['job_container']
        assert '.job-title' in scraper.selectors['title']
    
    def test_get_default_selectors(self, scraper):
        """Test default selector generation."""
        defaults = scraper._get_default_selectors()
        
        assert 'job_container' in defaults
        assert 'title' in defaults
        assert 'location' in defaults
        assert 'department' in defaults
        assert 'description' in defaults
        assert 'link' in defaults
        
        # Check that common selectors are included
        assert '.job-listing' in defaults['job_container']
        assert '.job-title' in defaults['title']
        assert 'h2' in defaults['title']
    
    def test_looks_like_job_link_valid(self, scraper):
        """Test job link detection with valid links."""
        valid_links = [
            ('https://company.com/jobs/engineer', 'Software Engineer'),
            ('https://company.com/careers/developer', 'Python Developer'),
            ('https://company.com/positions/manager', 'Product Manager'),
            ('https://company.com/openings/analyst', 'Data Analyst')
        ]
        
        for href, text in valid_links:
            assert scraper._looks_like_job_link(href, text) is True
    
    def test_looks_like_job_link_invalid(self, scraper):
        """Test job link detection with invalid links."""
        invalid_links = [
            ('mailto:hr@company.com', 'Contact HR'),
            ('https://facebook.com/company', 'Follow us'),
            ('tel:+1234567890', 'Call us'),
            ('javascript:void(0)', 'Click here'),
            ('#', 'Anchor link')
        ]
        
        for href, text in invalid_links:
            assert scraper._looks_like_job_link(href, text) is False
    
    def test_filter_jobs_by_criteria_job_titles(self, scraper):
        """Test job filtering by job titles."""
        jobs = [
            JobData(
                title="Software Engineer",
                company="Test Company",
                location="Remote",
                description="Great job",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,
                source="company_test",
                source_url="https://test.com/job1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Product Manager",
                company="Test Company",
                location="Remote",
                description="Another great job",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,
                source="company_test",
                source_url="https://test.com/job2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        search_params = {'job_titles': ['Engineer']}
        filtered = scraper._filter_jobs_by_criteria(jobs, search_params)
        
        assert len(filtered) == 1
        assert filtered[0].title == "Software Engineer"
    
    def test_filter_jobs_by_criteria_keywords(self, scraper):
        """Test job filtering by keywords."""
        jobs = [
            JobData(
                title="Developer",
                company="Test Company",
                location="Remote",
                description="Python development role",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,
                source="company_test",
                source_url="https://test.com/job1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Developer",
                company="Test Company",
                location="Remote",
                description="Java development role",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,
                source="company_test",
                source_url="https://test.com/job2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        search_params = {'keywords': ['Python']}
        filtered = scraper._filter_jobs_by_criteria(jobs, search_params)
        
        assert len(filtered) == 1
        assert "Python" in filtered[0].description
    
    def test_filter_jobs_by_criteria_remote(self, scraper):
        """Test job filtering by remote preference."""
        jobs = [
            JobData(
                title="Remote Developer",
                company="Test Company",
                location="Remote",
                description="Remote work",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=True,
                source="company_test",
                source_url="https://test.com/job1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Office Developer",
                company="Test Company",
                location="New York",
                description="Office work",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source="company_test",
                source_url="https://test.com/job2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        search_params = {'remote_ok': True}
        filtered = scraper._filter_jobs_by_criteria(jobs, search_params)
        
        assert len(filtered) == 1
        assert filtered[0].remote is True
    
    @pytest.mark.asyncio
    async def test_scraper_context_manager(self, scraper):
        """Test scraper as async context manager."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock) as mock_setup:
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock) as mock_cleanup:
                async with scraper:
                    assert mock_setup.called
                assert mock_cleanup.called
    
    @pytest.mark.asyncio
    async def test_scrape_jobs_with_mocked_page(self, scraper):
        """Test job scraping with mocked page interactions."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock):
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock):
                with patch.object(scraper, 'safe_page_goto', new_callable=AsyncMock) as mock_goto:
                    with patch.object(scraper, '_handle_popups', new_callable=AsyncMock):
                        with patch.object(scraper, '_extract_jobs_with_fallback', new_callable=AsyncMock) as mock_extract:
                            with patch.object(scraper, '_filter_jobs_by_criteria') as mock_filter:
                                
                                mock_goto.return_value = True
                                
                                mock_jobs = [
                                    JobData(
                                        title="Senior Engineer",
                                        company="Test Company",
                                        location="San Francisco",
                                        description="Great opportunity",
                                        requirements=[],
                                        benefits=[],
                                        job_type="full-time",
                                        remote=False,
                                        source="company_test_company",
                                        source_url="https://testcompany.com/jobs/123",
                                        posted_date=datetime.now(),
                                        discovered_date=datetime.now()
                                    )
                                ]
                                
                                mock_extract.return_value = mock_jobs
                                mock_filter.return_value = mock_jobs
                                
                                async with scraper:
                                    jobs = await scraper.scrape_jobs({'job_titles': ['Engineer']})
                                
                                assert len(jobs) == 1
                                assert jobs[0].title == "Senior Engineer"
                                assert jobs[0].company == "Test Company"
                                assert jobs[0].source == "company_test_company"
    
    @pytest.mark.asyncio
    async def test_scrape_jobs_navigation_failure(self, scraper):
        """Test handling of navigation failures."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock):
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock):
                with patch.object(scraper, 'safe_page_goto', new_callable=AsyncMock) as mock_goto:
                    
                    mock_goto.return_value = False  # Navigation fails
                    
                    async with scraper:
                        jobs = await scraper.scrape_jobs({'job_titles': ['Engineer']})
                    
                    assert len(jobs) == 0
    
    @pytest.mark.asyncio
    async def test_extract_text_from_selectors(self, scraper):
        """Test text extraction from multiple selectors."""
        # Mock element
        mock_element = AsyncMock()
        
        # Mock target element with text
        mock_target = AsyncMock()
        mock_target.text_content.return_value = "  Test Text  "
        
        def mock_query_selector(selector):
            if selector == '.found':
                return mock_target
            return None
        
        mock_element.query_selector.side_effect = mock_query_selector
        
        # Test with multiple selectors, second one should work
        selectors = ['.not-found', '.found', '.also-not-found']
        result = await scraper._extract_text_from_selectors(mock_element, selectors)
        
        assert result == "Test Text"
    
    @pytest.mark.asyncio
    async def test_extract_text_from_selectors_not_found(self, scraper):
        """Test text extraction when no selectors match."""
        # Mock element
        mock_element = AsyncMock()
        mock_element.query_selector.return_value = None
        
        selectors = ['.not-found', '.also-not-found']
        result = await scraper._extract_text_from_selectors(mock_element, selectors)
        
        assert result == ""
    
    @pytest.mark.asyncio
    async def test_extract_job_url(self, scraper):
        """Test job URL extraction from element."""
        # Mock element
        mock_element = AsyncMock()
        
        # Mock link element
        mock_link = AsyncMock()
        mock_link.get_attribute.return_value = "/jobs/123"
        mock_element.query_selector.return_value = mock_link
        
        result = await scraper._extract_job_url(mock_element)
        
        assert result == "https://testcompany.com/jobs/123"
    
    @pytest.mark.asyncio
    async def test_extract_job_url_element_is_link(self, scraper):
        """Test job URL extraction when element itself is a link."""
        # Mock element that is itself a link
        mock_element = AsyncMock()
        mock_element.query_selector.return_value = None  # No child link
        mock_element.get_attribute.return_value = "/careers/456"
        
        result = await scraper._extract_job_url(mock_element)
        
        assert result == "https://testcompany.com/careers/456"
    
    @pytest.mark.asyncio
    async def test_create_job_from_link(self, scraper):
        """Test job creation from link."""
        mock_link = AsyncMock()
        href = "/jobs/789"
        text = "Software Engineer Position"
        
        job_data = await scraper._create_job_from_link(mock_link, href, text)
        
        assert job_data is not None
        assert job_data.title == "Software Engineer Position"
        assert job_data.company == "Test Company"
        assert job_data.location == "Not specified"
        assert job_data.source == "company_test_company"
        assert job_data.source_url == "https://testcompany.com/jobs/789"
    
    @pytest.mark.asyncio
    async def test_create_job_from_link_invalid_title(self, scraper):
        """Test job creation from link with invalid title."""
        mock_link = AsyncMock()
        href = "/jobs/invalid"
        text = "X"  # Too short
        
        job_data = await scraper._create_job_from_link(mock_link, href, text)
        
        assert job_data is None
    
    @pytest.mark.asyncio
    async def test_error_handling(self, scraper):
        """Test error handling during scraping."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock):
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock):
                with patch.object(scraper, 'safe_page_goto', new_callable=AsyncMock) as mock_goto:
                    
                    # Simulate an exception during navigation
                    mock_goto.side_effect = Exception("Navigation failed")
                    
                    async with scraper:
                        jobs = await scraper.scrape_jobs({'job_titles': ['Engineer']})
                    
                    assert len(jobs) == 0
                    assert len(scraper.errors) > 0
                    assert "Test Company scraping failed" in scraper.errors[0]
    
    def test_execution_stats(self, scraper):
        """Test execution statistics generation."""
        # Add some mock data
        scraper.jobs_found = [Mock(), Mock(), Mock()]  # 3 jobs
        scraper.errors = []  # No errors
        
        stats = scraper.get_execution_stats()
        
        assert stats['source'] == 'company_test_company'
        assert stats['jobs_found'] == 3
        assert stats['error_count'] == 0
        assert stats['status'] == 'success'

if __name__ == "__main__":
    pytest.main([__file__])