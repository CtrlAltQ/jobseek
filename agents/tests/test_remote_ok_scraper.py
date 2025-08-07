"""
Tests for RemoteOK Job Scraper

This module contains integration tests for the RemoteOK scraper functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.remote_ok_scraper import RemoteOKScraper
from scrapers.base_scraper import JobData

class TestRemoteOKScraper:
    """Test RemoteOK scraper functionality."""
    
    @pytest.fixture
    def scraper(self):
        """Create a RemoteOK scraper instance."""
        return RemoteOKScraper()
    
    def test_scraper_initialization(self, scraper):
        """Test scraper initialization."""
        assert scraper.source_name == "remote_ok"
        assert scraper.base_url == "https://remoteok.io"
        assert scraper.rate_limit == 1.0
    
    def test_build_search_url_with_job_titles(self, scraper):
        """Test search URL building with job titles."""
        search_params = {
            'job_titles': ['Software Engineer']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'remoteok.io/software+engineer' in url
    
    def test_build_search_url_with_keywords(self, scraper):
        """Test search URL building with keywords."""
        search_params = {
            'keywords': ['Python Developer']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'remoteok.io/python+developer' in url
    
    def test_build_search_url_default(self, scraper):
        """Test search URL building with no parameters."""
        search_params = {}
        
        url = scraper._build_search_url(search_params)
        
        assert url == "https://remoteok.io"
    
    def test_parse_posted_date_now(self, scraper):
        """Test parsing 'now' posted date."""
        result = scraper._parse_posted_date('now')
        assert result.date() == datetime.now().date()
    
    def test_parse_posted_date_days_format(self, scraper):
        """Test parsing 'Xd' format."""
        result = scraper._parse_posted_date('3d')
        expected = datetime.now().date()
        # Should be approximately 3 days ago
        assert abs((expected - result.date()).days - 3) <= 1
    
    def test_parse_posted_date_hours_format(self, scraper):
        """Test parsing 'Xh' format."""
        result = scraper._parse_posted_date('6h')
        now = datetime.now()
        # Should be within the last 7 hours
        assert (now - result).total_seconds() < 7 * 3600
    
    def test_parse_posted_date_weeks_format(self, scraper):
        """Test parsing 'Xw' format."""
        result = scraper._parse_posted_date('2w')
        expected = datetime.now().date()
        # Should be approximately 14 days ago
        assert abs((expected - result.date()).days - 14) <= 2
    
    def test_parse_posted_date_months_format(self, scraper):
        """Test parsing 'Xm' format."""
        result = scraper._parse_posted_date('1m')
        expected = datetime.now().date()
        # Should be approximately 30 days ago
        assert abs((expected - result.date()).days - 30) <= 5
    
    def test_parse_posted_date_invalid(self, scraper):
        """Test parsing invalid date format."""
        result = scraper._parse_posted_date('invalid')
        assert result.date() == datetime.now().date()
    
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
                                    title="Remote Python Developer",
                                    company="RemoteOK Company",
                                    location="Remote",
                                    description="Remote position at RemoteOK Company",
                                    requirements=["Python", "Django"],
                                    benefits=[],
                                    job_type="full-time",
                                    remote=True,
                                    source="remote_ok",
                                    source_url="https://remoteok.io/remote-jobs/123",
                                    posted_date=datetime.now(),
                                    discovered_date=datetime.now()
                                )
                            ]
                            
                            async with scraper:
                                jobs = await scraper.scrape_jobs({'job_titles': ['Python Developer']})
                            
                            assert len(jobs) == 1
                            assert jobs[0].title == "Remote Python Developer"
                            assert jobs[0].company == "RemoteOK Company"
                            assert jobs[0].source == "remote_ok"
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
    async def test_extract_job_from_row_complete_data(self, scraper):
        """Test job extraction from row with complete data."""
        # Mock row element
        mock_row = AsyncMock()
        
        # Mock job link
        mock_job_link = AsyncMock()
        mock_job_link.get_attribute.return_value = "/remote-jobs/123-python-developer"
        mock_row.query_selector.return_value = mock_job_link
        
        # Mock title element
        mock_title = AsyncMock()
        mock_title.text_content.return_value = "Python Developer"
        
        # Mock company element
        mock_company = AsyncMock()
        mock_company.text_content.return_value = "Tech Company"
        
        # Mock tag elements
        mock_tag1 = AsyncMock()
        mock_tag1.text_content.return_value = "Python"
        mock_tag2 = AsyncMock()
        mock_tag2.text_content.return_value = "Django"
        
        # Mock salary element
        mock_salary = AsyncMock()
        mock_salary.text_content.return_value = "$80k-$120k"
        
        # Mock date element
        mock_date = AsyncMock()
        mock_date.text_content.return_value = "2d"
        
        # Set up query_selector responses
        def mock_query_selector(selector):
            if 'company a' in selector:
                return mock_job_link
            elif 'company h2' in selector:
                return mock_title
            elif 'company h3' in selector:
                return mock_company
            elif '.salary' in selector:
                return mock_salary
            elif 'time' in selector:
                return mock_date
            return None
        
        def mock_query_selector_all(selector):
            if '.tag' in selector:
                return [mock_tag1, mock_tag2]
            return []
        
        mock_row.query_selector.side_effect = mock_query_selector
        mock_row.query_selector_all.side_effect = mock_query_selector_all
        
        # Set up scraper page
        scraper.page = AsyncMock()
        
        job_data = await scraper._extract_job_from_row(mock_row)
        
        assert job_data is not None
        assert job_data.title == "Python Developer"
        assert job_data.company == "Tech Company"
        assert job_data.location == "Remote"
        assert job_data.remote is True
        assert job_data.source == "remote_ok"
        assert "Python" in job_data.requirements
        assert "Django" in job_data.requirements
    
    @pytest.mark.asyncio
    async def test_extract_job_from_row_missing_data(self, scraper):
        """Test job extraction from row with missing critical data."""
        # Mock row element with no job link
        mock_row = AsyncMock()
        mock_row.query_selector.return_value = None
        
        scraper.page = AsyncMock()
        
        job_data = await scraper._extract_job_from_row(mock_row)
        
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
                    assert "RemoteOK scraping failed" in scraper.errors[0]
    
    def test_execution_stats(self, scraper):
        """Test execution statistics generation."""
        # Add some mock data
        scraper.jobs_found = [Mock()]  # 1 job
        scraper.errors = []  # No errors
        
        stats = scraper.get_execution_stats()
        
        assert stats['source'] == 'remote_ok'
        assert stats['jobs_found'] == 1
        assert stats['error_count'] == 0
        assert stats['status'] == 'success'

if __name__ == "__main__":
    pytest.main([__file__])