"""
Tests for LinkedIn Job Scraper

This module contains integration tests for the LinkedIn scraper functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.linkedin_scraper import LinkedInScraper
from scrapers.base_scraper import JobData

class TestLinkedInScraper:
    """Test LinkedIn scraper functionality."""
    
    @pytest.fixture
    def scraper(self):
        """Create a LinkedIn scraper instance."""
        return LinkedInScraper()
    
    def test_scraper_initialization(self, scraper):
        """Test scraper initialization."""
        assert scraper.source_name == "linkedin"
        assert scraper.base_url == "https://www.linkedin.com"
        assert scraper.rate_limit == 0.5  # More conservative rate limiting
        assert scraper.jobs_url == "https://www.linkedin.com/jobs/search"
    
    def test_build_search_url_basic(self, scraper):
        """Test basic search URL building."""
        search_params = {
            'job_titles': ['Software Engineer'],
            'locations': ['San Francisco, CA']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'linkedin.com/jobs/search' in url
        assert 'keywords=' in url
        assert 'location=San+Francisco%2C+CA' in url
        assert 'sortBy=DD' in url  # Sort by date
    
    def test_build_search_url_with_keywords(self, scraper):
        """Test search URL building with keywords."""
        search_params = {
            'job_titles': ['Python Developer'],
            'keywords': ['Django', 'PostgreSQL']
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'keywords=' in url
        # Should contain job titles and keywords
        assert 'Python' in url or 'Django' in url
    
    def test_build_search_url_remote(self, scraper):
        """Test search URL building for remote jobs."""
        search_params = {
            'job_titles': ['Developer'],
            'remote_ok': True
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'f_WT=2' in url  # LinkedIn's remote work filter
    
    def test_build_search_url_job_type(self, scraper):
        """Test search URL building with job type."""
        search_params = {
            'job_titles': ['Engineer'],
            'job_type': 'full-time'
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'f_JT=F' in url  # LinkedIn's full-time filter
    
    def test_build_search_url_date_filter(self, scraper):
        """Test search URL building with date filter."""
        search_params = {
            'job_titles': ['Engineer'],
            'days_back': 7
        }
        
        url = scraper._build_search_url(search_params)
        
        assert 'f_TPR=r604800' in url  # Past week filter
    
    def test_parse_posted_date_just_now(self, scraper):
        """Test parsing 'just now' posted date."""
        result = scraper._parse_posted_date('just now')
        assert result.date() == datetime.now().date()
    
    def test_parse_posted_date_days_ago(self, scraper):
        """Test parsing 'X days ago' format."""
        result = scraper._parse_posted_date('2 days ago')
        expected = datetime.now().date()
        # Should be approximately 2 days ago
        assert abs((expected - result.date()).days - 2) <= 1
    
    def test_parse_posted_date_hours_ago(self, scraper):
        """Test parsing 'X hours ago' format."""
        result = scraper._parse_posted_date('4 hours ago')
        now = datetime.now()
        # Should be within the last 5 hours
        assert (now - result).total_seconds() < 5 * 3600
    
    def test_parse_posted_date_weeks_ago(self, scraper):
        """Test parsing 'X weeks ago' format."""
        result = scraper._parse_posted_date('1 week ago')
        expected = datetime.now().date()
        # Should be approximately 7 days ago
        assert abs((expected - result.date()).days - 7) <= 2
    
    def test_parse_posted_date_invalid(self, scraper):
        """Test parsing invalid date format."""
        result = scraper._parse_posted_date('invalid date')
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
                    with patch.object(scraper, '_handle_auth_prompts', new_callable=AsyncMock):
                        with patch.object(scraper, '_extract_jobs_from_page', new_callable=AsyncMock) as mock_extract:
                            
                            mock_goto.return_value = True
                            mock_extract.return_value = [
                                JobData(
                                    title="Senior Software Engineer",
                                    company="LinkedIn Corp",
                                    location="San Francisco, CA",
                                    description="Exciting opportunity",
                                    requirements=["Java", "Python"],
                                    benefits=["Stock options"],
                                    job_type="full-time",
                                    remote=False,
                                    source="linkedin",
                                    source_url="https://linkedin.com/jobs/view/123",
                                    posted_date=datetime.now(),
                                    discovered_date=datetime.now()
                                )
                            ]
                            
                            async with scraper:
                                jobs = await scraper.scrape_jobs({'job_titles': ['Software Engineer']})
                            
                            assert len(jobs) == 1
                            assert jobs[0].title == "Senior Software Engineer"
                            assert jobs[0].company == "LinkedIn Corp"
                            assert jobs[0].source == "linkedin"
    
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
    async def test_scrape_jobs_with_load_more(self, scraper):
        """Test job scraping with 'load more' functionality."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock):
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock):
                with patch.object(scraper, 'safe_page_goto', new_callable=AsyncMock) as mock_goto:
                    with patch.object(scraper, '_handle_auth_prompts', new_callable=AsyncMock):
                        with patch.object(scraper, '_extract_jobs_from_page', new_callable=AsyncMock) as mock_extract:
                            with patch.object(scraper, '_load_more_jobs', new_callable=AsyncMock) as mock_load_more:
                                
                                mock_goto.return_value = True
                                
                                # First call returns 1 job, second call returns 2 jobs (indicating more loaded)
                                mock_extract.side_effect = [
                                    [
                                        JobData(
                                            title="Job 1",
                                            company="Company 1",
                                            location="Location 1",
                                            description="Description 1",
                                            requirements=[],
                                            benefits=[],
                                            job_type="full-time",
                                            remote=False,
                                            source="linkedin",
                                            source_url="https://linkedin.com/jobs/view/1",
                                            posted_date=datetime.now(),
                                            discovered_date=datetime.now()
                                        )
                                    ],
                                    [
                                        JobData(
                                            title="Job 1",
                                            company="Company 1",
                                            location="Location 1",
                                            description="Description 1",
                                            requirements=[],
                                            benefits=[],
                                            job_type="full-time",
                                            remote=False,
                                            source="linkedin",
                                            source_url="https://linkedin.com/jobs/view/1",
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
                                            remote=False,
                                            source="linkedin",
                                            source_url="https://linkedin.com/jobs/view/2",
                                            posted_date=datetime.now(),
                                            discovered_date=datetime.now()
                                        )
                                    ]
                                ]
                                
                                # Mock load more returns True once, then False
                                mock_load_more.side_effect = [True, False]
                                
                                async with scraper:
                                    jobs = await scraper.scrape_jobs({
                                        'job_titles': ['Engineer'],
                                        'max_pages': 2
                                    })
                                
                                assert len(jobs) == 2
                                assert jobs[0].title == "Job 1"
                                assert jobs[1].title == "Job 2"
    
    @pytest.mark.asyncio
    async def test_load_more_jobs_button_click(self, scraper):
        """Test load more jobs functionality with button click."""
        # Mock page object
        mock_page = AsyncMock()
        scraper.page = mock_page
        
        # Mock show more button
        mock_button = AsyncMock()
        mock_page.query_selector.return_value = mock_button
        mock_page.query_selector_all.return_value = [Mock(), Mock()]  # 2 job cards
        
        result = await scraper._load_more_jobs()
        
        assert result is True
        mock_button.click.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_load_more_jobs_scroll_fallback(self, scraper):
        """Test load more jobs functionality with scroll fallback."""
        # Mock page object
        mock_page = AsyncMock()
        scraper.page = mock_page
        
        # No show more button found
        mock_page.query_selector.return_value = None
        mock_page.query_selector_all.return_value = [Mock()]  # 1 job card
        
        result = await scraper._load_more_jobs()
        
        assert result is True
        mock_page.evaluate.assert_called_once()
    
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
                    assert "LinkedIn scraping failed" in scraper.errors[0]
    
    def test_execution_stats(self, scraper):
        """Test execution statistics generation."""
        # Add some mock data
        scraper.jobs_found = [Mock(), Mock(), Mock()]  # 3 jobs
        scraper.errors = []  # No errors
        
        stats = scraper.get_execution_stats()
        
        assert stats['source'] == 'linkedin'
        assert stats['jobs_found'] == 3
        assert stats['error_count'] == 0
        assert stats['status'] == 'success'

if __name__ == "__main__":
    pytest.main([__file__])