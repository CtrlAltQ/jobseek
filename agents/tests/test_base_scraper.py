"""
Tests for Base Job Scraper

This module contains comprehensive tests for the base scraper functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.base_scraper import BaseJobScraper, JobData
from utils.data_utils import JobDataProcessor, SalaryInfo

class TestJobScraper(BaseJobScraper):
    """Test implementation of BaseJobScraper for testing."""
    
    async def _scrape_jobs_impl(self, search_params):
        """Mock implementation for testing."""
        return [
            JobData(
                title="Software Engineer",
                company="Test Company",
                location="San Francisco, CA",
                description="Test job description",
                requirements=["Python", "JavaScript"],
                benefits=["Health insurance"],
                job_type="full-time",
                remote=False,
                source="test",
                source_url="https://test.com/job/1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]

class TestJobData:
    """Test JobData class functionality."""
    
    def test_job_data_creation(self):
        """Test JobData creation and basic properties."""
        job = JobData(
            title="Senior Python Developer",
            company="Tech Corp",
            location="Remote",
            description="Great opportunity for a Python developer",
            requirements=["Python", "Django", "PostgreSQL"],
            benefits=["Health insurance", "401k"],
            job_type="full-time",
            remote=True,
            source="indeed",
            source_url="https://indeed.com/job/123",
            posted_date=datetime(2024, 1, 1),
            discovered_date=datetime(2024, 1, 2),
            salary_min=80000,
            salary_max=120000
        )
        
        assert job.title == "Senior Python Developer"
        assert job.company == "Tech Corp"
        assert job.remote is True
        assert job.salary_min == 80000
        assert job.salary_max == 120000
    
    def test_job_data_to_dict(self):
        """Test JobData conversion to dictionary."""
        job = JobData(
            title="Data Scientist",
            company="AI Company",
            location="New York, NY",
            description="Data science role",
            requirements=["Python", "ML"],
            benefits=["Stock options"],
            job_type="full-time",
            remote=False,
            source="linkedin",
            source_url="https://linkedin.com/job/456",
            posted_date=datetime(2024, 1, 1),
            discovered_date=datetime(2024, 1, 2),
            salary_min=90000,
            salary_max=130000,
            salary_currency="USD"
        )
        
        job_dict = job.to_dict()
        
        assert job_dict['title'] == "Data Scientist"
        assert job_dict['company'] == "AI Company"
        assert 'salary' in job_dict
        assert job_dict['salary']['min'] == 90000
        assert job_dict['salary']['max'] == 130000
        assert job_dict['salary']['currency'] == "USD"
        assert 'salary_min' not in job_dict  # Should be removed
        assert isinstance(job_dict['posted_date'], str)  # Should be ISO string
    
    def test_job_data_hash(self):
        """Test JobData hash generation for duplicate detection."""
        job1 = JobData(
            title="Software Engineer",
            company="Test Company",
            location="SF",
            description="Test",
            requirements=[],
            benefits=[],
            job_type="full-time",
            remote=False,
            source="test",
            source_url="https://test.com/job/1",
            posted_date=datetime.now(),
            discovered_date=datetime.now()
        )
        
        job2 = JobData(
            title="Software Engineer",
            company="Test Company",
            location="Different Location",  # Different location
            description="Different description",  # Different description
            requirements=["Different"],
            benefits=["Different"],
            job_type="part-time",  # Different type
            remote=True,  # Different remote
            source="test",
            source_url="https://test.com/job/1",  # Same URL
            posted_date=datetime.now(),
            discovered_date=datetime.now()
        )
        
        # Should have same hash because title, company, and URL are the same
        assert job1.get_hash() == job2.get_hash()
        
        # Different URL should produce different hash
        job3 = JobData(
            title="Software Engineer",
            company="Test Company",
            location="SF",
            description="Test",
            requirements=[],
            benefits=[],
            job_type="full-time",
            remote=False,
            source="test",
            source_url="https://test.com/job/2",  # Different URL
            posted_date=datetime.now(),
            discovered_date=datetime.now()
        )
        
        assert job1.get_hash() != job3.get_hash()

class TestBaseJobScraper:
    """Test BaseJobScraper functionality."""
    
    @pytest.fixture
    def scraper(self):
        """Create a test scraper instance."""
        return TestJobScraper("test", "https://test.com", rate_limit=1.0)
    
    @pytest.mark.asyncio
    async def test_scraper_context_manager(self, scraper):
        """Test scraper as async context manager."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock) as mock_setup:
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock) as mock_cleanup:
                async with scraper:
                    assert mock_setup.called
                assert mock_cleanup.called
    
    @pytest.mark.asyncio
    async def test_scrape_jobs_success(self, scraper):
        """Test successful job scraping."""
        with patch.object(scraper, 'setup_browser', new_callable=AsyncMock):
            with patch.object(scraper, 'cleanup', new_callable=AsyncMock):
                async with scraper:
                    jobs = await scraper.scrape_jobs({"query": "python developer"})
                    
                    assert len(jobs) == 1
                    assert jobs[0].title == "Software Engineer"
                    assert jobs[0].company == "Test Company"
                    assert scraper.jobs_found == jobs
    
    @pytest.mark.asyncio
    async def test_duplicate_filtering(self, scraper):
        """Test duplicate job filtering."""
        # Mock the implementation to return duplicates
        duplicate_jobs = [
            JobData(
                title="Software Engineer",
                company="Test Company",
                location="SF",
                description="Test",
                requirements=[],
                benefits=[],
                job_type="full-time",
                remote=False,
                source="test",
                source_url="https://test.com/job/1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Software Engineer",
                company="Test Company",
                location="SF",
                description="Different description",  # Different description
                requirements=["Python"],  # Different requirements
                benefits=["Health"],  # Different benefits
                job_type="full-time",
                remote=False,
                source="test",
                source_url="https://test.com/job/1",  # Same URL - should be duplicate
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        with patch.object(scraper, '_scrape_jobs_impl', new_callable=AsyncMock) as mock_scrape:
            mock_scrape.return_value = duplicate_jobs
            
            with patch.object(scraper, 'setup_browser', new_callable=AsyncMock):
                with patch.object(scraper, 'cleanup', new_callable=AsyncMock):
                    async with scraper:
                        jobs = await scraper.scrape_jobs({"query": "test"})
                        
                        # Should filter out duplicate
                        assert len(jobs) == 1
                        assert len(scraper.duplicate_hashes) == 1
    
    def test_execution_stats(self, scraper):
        """Test execution statistics generation."""
        scraper.jobs_found = [Mock(), Mock(), Mock()]  # 3 jobs
        scraper.errors = ["Error 1", "Error 2"]  # 2 errors
        
        stats = scraper.get_execution_stats()
        
        assert stats['source'] == 'test'
        assert stats['jobs_found'] == 3
        assert stats['jobs_processed'] == 3
        assert stats['error_count'] == 2
        assert stats['status'] == 'partial'  # Has jobs but also errors
        assert 'start_time' in stats
        assert 'end_time' in stats
        assert 'duration_seconds' in stats
    
    def test_execution_stats_success(self, scraper):
        """Test execution statistics for successful run."""
        scraper.jobs_found = [Mock(), Mock()]  # 2 jobs
        scraper.errors = []  # No errors
        
        stats = scraper.get_execution_stats()
        assert stats['status'] == 'success'
    
    def test_execution_stats_failed(self, scraper):
        """Test execution statistics for failed run."""
        scraper.jobs_found = []  # No jobs
        scraper.errors = ["Error 1"]  # Has errors
        
        stats = scraper.get_execution_stats()
        assert stats['status'] == 'failed'

class TestJobDataProcessor:
    """Test JobDataProcessor utility functions."""
    
    def test_normalize_job_type(self):
        """Test job type normalization."""
        assert JobDataProcessor.normalize_job_type("Full Time") == "full-time"
        assert JobDataProcessor.normalize_job_type("FULLTIME") == "full-time"
        assert JobDataProcessor.normalize_job_type("ft") == "full-time"
        assert JobDataProcessor.normalize_job_type("Part Time") == "part-time"
        assert JobDataProcessor.normalize_job_type("contractor") == "contract"
        assert JobDataProcessor.normalize_job_type("intern") == "internship"
        assert JobDataProcessor.normalize_job_type("") == "full-time"  # Default
        assert JobDataProcessor.normalize_job_type(None) == "full-time"  # Default
    
    def test_detect_remote_work(self):
        """Test remote work detection."""
        assert JobDataProcessor.detect_remote_work("This is a remote position") is True
        assert JobDataProcessor.detect_remote_work("Work from home opportunity") is True
        assert JobDataProcessor.detect_remote_work("WFH available") is True
        assert JobDataProcessor.detect_remote_work("Distributed team") is True
        assert JobDataProcessor.detect_remote_work("Office-based position") is False
        assert JobDataProcessor.detect_remote_work("On-site required") is False
        assert JobDataProcessor.detect_remote_work("") is False
        assert JobDataProcessor.detect_remote_work(None) is False
    
    def test_parse_salary_range(self):
        """Test salary range parsing."""
        salary = JobDataProcessor.parse_salary("$80,000 - $120,000 per year")
        assert salary.min_salary == 80000
        assert salary.max_salary == 120000
        assert salary.period == "year"
        
        salary = JobDataProcessor.parse_salary("$80k - $120k")
        assert salary.min_salary == 80000
        assert salary.max_salary == 120000
        assert salary.period == "year"
    
    def test_parse_salary_single(self):
        """Test single salary parsing."""
        salary = JobDataProcessor.parse_salary("$90,000 per year")
        assert salary.min_salary == 90000
        assert salary.max_salary is None
        assert salary.period == "year"
        
        salary = JobDataProcessor.parse_salary("$45 per hour")
        assert salary.min_salary == 45
        assert salary.max_salary is None
        assert salary.period == "hour"
    
    def test_parse_salary_up_to(self):
        """Test 'up to' salary parsing."""
        salary = JobDataProcessor.parse_salary("Up to $100,000")
        assert salary.min_salary == 100000
        assert salary.max_salary is None
        assert salary.period == "year"
    
    def test_parse_salary_plus(self):
        """Test salary plus parsing."""
        salary = JobDataProcessor.parse_salary("$85,000+")
        assert salary.min_salary == 85000
        assert salary.max_salary is None
        assert salary.period == "year"
    
    def test_parse_salary_invalid(self):
        """Test invalid salary parsing."""
        salary = JobDataProcessor.parse_salary("Competitive salary")
        assert salary.min_salary is None
        assert salary.max_salary is None
        
        salary = JobDataProcessor.parse_salary("")
        assert salary.min_salary is None
        assert salary.max_salary is None
    
    def test_extract_requirements(self):
        """Test requirements extraction."""
        description = """
        We are looking for a great developer.
        
        Requirements:
        - 3+ years of Python experience
        - Experience with Django framework
        - Knowledge of PostgreSQL
        - Strong communication skills
        
        Nice to have:
        - AWS experience
        """
        
        requirements = JobDataProcessor.extract_requirements(description)
        assert len(requirements) > 0
        assert any("Python" in req for req in requirements)
        assert any("Django" in req for req in requirements)
    
    def test_extract_benefits(self):
        """Test benefits extraction."""
        description = """
        Great company with excellent benefits.
        
        Benefits:
        - Health insurance
        - 401k matching
        - Flexible work hours
        - Professional development budget
        
        We also offer free lunch and gym membership.
        """
        
        benefits = JobDataProcessor.extract_benefits(description)
        assert len(benefits) > 0
        assert any("health insurance" in benefit.lower() for benefit in benefits)
        assert any("401k" in benefit.lower() for benefit in benefits)
    
    def test_clean_text(self):
        """Test text cleaning."""
        dirty_text = "  This   has    extra   spaces  \n\n  and  newlines  "
        clean_text = JobDataProcessor.clean_text(dirty_text)
        assert clean_text == "This has extra spaces and newlines"
        
        assert JobDataProcessor.clean_text("") == ""
        assert JobDataProcessor.clean_text(None) == ""
    
    def test_validate_job_data_valid(self):
        """Test job data validation with valid data."""
        job_data = {
            'title': 'Software Engineer',
            'company': 'Tech Corp',
            'location': 'San Francisco, CA',
            'description': 'This is a great opportunity for a software engineer to join our team and work on exciting projects.',
            'source_url': 'https://example.com/job/123',
            'job_type': 'full-time'
        }
        
        is_valid, errors = JobDataProcessor.validate_job_data(job_data)
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_job_data_invalid(self):
        """Test job data validation with invalid data."""
        job_data = {
            'title': 'SE',  # Too short
            'company': '',  # Missing
            'location': 'SF',
            'description': 'Short',  # Too short
            'source_url': 'not-a-url',  # Invalid URL
            'job_type': 'invalid-type'  # Invalid job type
        }
        
        is_valid, errors = JobDataProcessor.validate_job_data(job_data)
        assert is_valid is False
        assert len(errors) > 0
        assert any("Missing required field: company" in error for error in errors)
        assert any("Job title too short" in error for error in errors)
        assert any("Job description too short" in error for error in errors)
        assert any("Invalid source URL format" in error for error in errors)
        assert any("Invalid job type" in error for error in errors)

if __name__ == "__main__":
    pytest.main([__file__])