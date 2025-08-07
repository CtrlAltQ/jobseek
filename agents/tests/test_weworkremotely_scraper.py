"""
Tests for WeWorkRemotely Job Scraper

This module contains integration tests for the WeWorkRemotely scraper functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.weworkremotely_scraper import WeWorkRemotelyScraper
from scrapers.base_scraper import JobData

class TestWeWorkRemotelyScraper:
    """Test WeWorkRemotely scraper functionality."""
    
    @pytest.fixture
    def scraper(self):
        """Create a WeWorkRemotely scraper instance."""
        return WeWorkRemotelyScraper()
    
    def test_scraper_initialization(self, scraper):
        """Test scraper initialization."""
        assert scraper.source_name == "weworkremotely"
        assert scraper.base_url == "https://weworkremotely.com"
        assert scraper.rate_limit == 1.0
        assert scraper.jobs_url == "https://weworkremotely.com/remote-jobs"
    
    def test_build_search_url_programming(self, scraper):
        """Test search URL building for programming jobs."""
        search_params = {
            'job_titles': ['Software Engineer']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'weworkremotely.com/remote-jobs/programming' in url
    
    def test_build_search_url_design(self, scraper):
        """Test search URL building for design jobs."""
        search_params = {
            'keywords': ['UI Designer']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'weworkremotely.com/remote-jobs/design' in url
    
    def test_build_search_url_marketing(self, scraper):
        """Test search URL building for marketing jobs."""
        search_params = {
            'job_titles': ['Marketing Manager']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'weworkremotely.com/remote-jobs/marketing' in url
    
    def test_build_search_url_data_science(self, scraper):
        """Test search URL building for data science jobs."""
        search_params = {
            'keywords': ['Data Scientist']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'weworkremotely.com/remote-jobs/programming' in url  # Data jobs go to programming
    
    def test_build_search_url_default(self, scraper):
        """Test search URL building with no specific category."""
        search_params = {
            'job_titles': ['Manager']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'weworkremotely.com/remote-jobs/programming' in url  # Default to programming
    
    def test_build_search_url_empty(self, scraper):
        """Test search URL building with empty parameters."""
        search_params = {}
        
        url = scraper._build_search_url(search_params)
        
        assert 'weworkremotely.com/remote-jobs/programming' in url  # Default to programming
    
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
                        with patch.object(scraper, '_extract_jobs_from_page', new_callable=AsyncMock) as mock_extract:
                            
                            mock_goto.return_value = True
                            mock_extract.return_value = [
                                JobData(
                                    title="Remote Full Stack Developer",
                                    company="WeWork Remote Company",
                                    location="Remote",
                                    description="Remote position at WeWork Remote Company",
                                    requirements=[],
                                    benefits=[],
                                    job_type="full-time",
                                    remote=True,
                                    source="weworkremotely",
                                    source_url="https://weworkremotely.com/remote-jobs/123",
                                    posted_date=datetime.now(),
                                    discovered_date=datetime.now()
                                )
                            ]
                            
                            async with scraper:
                                jobs = await scraper.scrape_jobs({'job_titles': ['Full Stack Developer']})
                            
                            assert len(jobs) == 1
                            assert jobs[0].title == "Remote Full Stack Developer"
                            assert jobs[0].company == "WeWork Remote Company"
                            assert jobs[0].source == "weworkremotely"
                            assert jobs[0].remote is True
    
    @pytest.mark.asyncio
    async def test_scrape_jobs_navigation_failure(self, scraper):
        """Test handling of navigation failures."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock):
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock):
                with patch.object(scraper, 'safe_page_goto', new_callable=AsyncMock) as mock_goto:
                    
                    mock_goto.return_value = False  # Navigation fails
                    
                    async with scraper:
                        jobs = await scraper.scrape_jobs({'job_titles': ['Developer']})
                    
                    assert len(jobs) == 0
    
    @pytest.mark.asyncio
    async def test_extract_job_from_item_colon_format(self, scraper):
        """Test job extraction from item with 'Company: Title' format."""
        # Mock job item
        mock_item = AsyncMock()
        
        # Mock job link
        mock_job_link = AsyncMock()
        mock_job_link.get_attribute.return_value = "/remote-jobs/123-developer"
        mock_job_link.text_content.return_value = "Tech Corp: Senior Developer"
        mock_item.query_selector.return_value = mock_job_link
        
        # Mock region element
        mock_region = AsyncMock()
        mock_region.text_content.return_value = "US Only"
        
        def mock_query_selector(selector):
            if selector == 'a':
                return mock_job_link
            elif selector == '.region':
                return mock_region
            return None
        
        mock_item.query_selector.side_effect = mock_query_selector
        
        # Set up scraper
        scraper.page = AsyncMock()
        
        job_data = await scraper._extract_job_from_item(mock_item)
        
        assert job_data is not None
        assert job_data.title == "Senior Developer"
        assert job_data.company == "Tech Corp"
        assert job_data.location == "Remote (US Only)"
        assert job_data.remote is True
        assert job_data.source == "weworkremotely"
    
    @pytest.mark.asyncio
    async def test_extract_job_from_item_span_format(self, scraper):
        """Test job extraction from item with separate company/title spans."""
        # Mock job item
        mock_item = AsyncMock()
        
        # Mock job link
        mock_job_link = AsyncMock()
        mock_job_link.get_attribute.return_value = "/remote-jobs/456-analyst"
        mock_job_link.text_content.return_value = "Data Analyst Position"  # No colon format
        
        # Mock company and title elements
        mock_company = AsyncMock()
        mock_company.text_content.return_value = "Data Company"
        mock_title = AsyncMock()
        mock_title.text_content.return_value = "Data Analyst"
        
        def mock_query_selector(selector):
            if selector == 'a':
                return mock_job_link
            elif selector == '.company':
                return mock_company
            elif selector == '.title':
                return mock_title
            elif selector == '.region':
                return None
            return None
        
        mock_item.query_selector.side_effect = mock_query_selector
        
        # Set up scraper
        scraper.page = AsyncMock()
        
        job_data = await scraper._extract_job_from_item(mock_item)
        
        assert job_data is not None
        assert job_data.title == "Data Analyst"
        assert job_data.company == "Data Company"
        assert job_data.location == "Remote"
        assert job_data.remote is True
        assert job_data.source == "weworkremotely"
    
    @pytest.mark.asyncio
    async def test_extract_job_from_item_fallback_format(self, scraper):
        """Test job extraction from item with fallback to full text as title."""
        # Mock job item
        mock_item = AsyncMock()
        
        # Mock job link
        mock_job_link = AsyncMock()
        mock_job_link.get_attribute.return_value = "/remote-jobs/789-position"
        mock_job_link.text_content.return_value = "Interesting Position"  # No colon, no spans
        
        def mock_query_selector(selector):
            if selector == 'a':
                return mock_job_link
            elif selector in ['.company', '.title', '.region']:
                return None
            return None
        
        mock_item.query_selector.side_effect = mock_query_selector
        
        # Set up scraper
        scraper.page = AsyncMock()
        
        job_data = await scraper._extract_job_from_item(mock_item)
        
        assert job_data is not None
        assert job_data.title == "Interesting Position"
        assert job_data.company == "Unknown"
        assert job_data.location == "Remote"
        assert job_data.remote is True
        assert job_data.source == "weworkremotely"
    
    @pytest.mark.asyncio
    async def test_extract_job_from_item_missing_link(self, scraper):
        """Test job extraction from item with missing job link."""
        # Mock job item with no link
        mock_item = AsyncMock()
        mock_item.query_selector.return_value = None
        
        scraper.page = AsyncMock()
        
        job_data = await scraper._extract_job_from_item(mock_item)
        
        assert job_data is None
    
    @pytest.mark.asyncio
    async def test_extract_job_from_item_missing_critical_data(self, scraper):
        """Test job extraction from item with missing critical data."""
        # Mock job item
        mock_item = AsyncMock()
        
        # Mock job link with empty text
        mock_job_link = AsyncMock()
        mock_job_link.get_attribute.return_value = "/remote-jobs/empty"
        mock_job_link.text_content.return_value = ""  # Empty title
        mock_item.query_selector.return_value = mock_job_link
        
        scraper.page = AsyncMock()
        
        job_data = await scraper._extract_job_from_item(mock_item)
        
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
                        jobs = await scraper.scrape_jobs({'job_titles': ['Developer']})
                    
                    assert len(jobs) == 0
                    assert len(scraper.errors) > 0
                    assert "WeWorkRemotely scraping failed" in scraper.errors[0]
    
    def test_execution_stats(self, scraper):
        """Test execution statistics generation."""
        # Add some mock data
        scraper.jobs_found = [Mock(), Mock()]  # 2 jobs
        scraper.errors = ["Minor error"]  # 1 error
        
        stats = scraper.get_execution_stats()
        
        assert stats['source'] == 'weworkremotely'
        assert stats['jobs_found'] == 2
        assert stats['error_count'] == 1
        assert stats['status'] == 'partial'  # Has jobs but also errors

if __name__ == "__main__":
    pytest.main([__file__])