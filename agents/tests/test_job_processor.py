"""
Tests for Job Processing Pipeline

This module contains tests for the job processing pipeline functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.job_processor import JobProcessingPipeline, EnhancedJobData
from ai.ai_client import JobAnalysis
from scrapers.base_scraper import JobData

class TestEnhancedJobData:
    """Test EnhancedJobData functionality."""
    
    def test_enhanced_job_data_creation(self):
        """Test EnhancedJobData creation."""
        analysis = JobAnalysis(
            relevance_score=0.8,
            summary="Great role",
            extracted_requirements=["Python"],
            extracted_benefits=["Health"],
            match_reasons=["Skills match"],
            concerns=["Remote unclear"],
            salary_estimate={"min": 80000, "max": 120000, "currency": "USD"}
        )
        
        job = EnhancedJobData(
            title="Python Developer",
            company="Tech Corp",
            location="San Francisco",
            description="Python development role",
            requirements=["Python"],
            benefits=["401k"],
            job_type="full-time",
            remote=False,
            source="indeed",
            source_url="https://indeed.com/job/123",
            posted_date=datetime.now(),
            discovered_date=datetime.now(),
            ai_analysis=analysis,
            processing_status="completed"
        )
        
        assert job.title == "Python Developer"
        assert job.ai_analysis == analysis
        assert job.processing_status == "completed"
        # EnhancedJobData inherits from JobData, so relevance_score needs to be set explicitly
        # The AI analysis is stored separately
        assert job.ai_analysis.relevance_score == 0.8
    
    def test_enhanced_job_data_to_dict(self):
        """Test EnhancedJobData to_dict conversion."""
        analysis = JobAnalysis(
            relevance_score=0.9,
            summary="Perfect match",
            extracted_requirements=["Django"],
            extracted_benefits=["Remote work"],
            match_reasons=["Django experience"],
            concerns=[],
            salary_estimate={"min": 90000, "max": 130000, "currency": "USD"}
        )
        
        job = EnhancedJobData(
            title="Django Developer",
            company="Web Company",
            location="Remote",
            description="Django web development",
            requirements=["Python"],  # Will be extended with AI requirements
            benefits=["Health"],  # Will be extended with AI benefits
            job_type="full-time",
            remote=True,
            source="linkedin",
            source_url="https://linkedin.com/job/456",
            posted_date=datetime.now(),
            discovered_date=datetime.now(),
            ai_analysis=analysis,
            processing_status="completed",
            processing_timestamp=datetime.now()
        )
        
        job_dict = job.to_dict()
        
        assert job_dict['title'] == "Django Developer"
        assert job_dict['relevance_score'] == 0.9
        assert job_dict['ai_summary'] == "Perfect match"
        assert 'ai_analysis' in job_dict
        assert job_dict['ai_analysis']['relevance_score'] == 0.9
        assert "Django" in job_dict['requirements']  # AI-extracted requirement added
        assert "Remote work" in job_dict['benefits']  # AI-extracted benefit added
        assert job_dict['processing_status'] == "completed"

class TestJobProcessingPipeline:
    """Test JobProcessingPipeline functionality."""
    
    @pytest.fixture
    def mock_ai_processor(self):
        """Create mock AI processor."""
        mock_processor = AsyncMock()
        mock_analysis = JobAnalysis(
            relevance_score=0.75,
            summary="Good Python role",
            extracted_requirements=["Python", "Django"],
            extracted_benefits=["Health insurance"],
            match_reasons=["Python skills"],
            concerns=["Salary not mentioned"],
            salary_estimate={"min": 85000, "max": 115000, "currency": "USD"}
        )
        # Return multiple analyses for batch processing
        mock_processor.batch_analyze_jobs.return_value = [mock_analysis, mock_analysis]
        mock_processor.get_provider_info.return_value = {
            'active_provider': 'openai',
            'openai_available': True,
            'anthropic_available': False
        }
        return mock_processor
    
    @pytest.fixture
    def sample_jobs(self):
        """Create sample JobData objects."""
        return [
            JobData(
                title="Python Developer",
                company="Tech Startup",
                location="San Francisco",
                description="Build Python applications",
                requirements=["Python"],
                benefits=["401k"],
                job_type="full-time",
                remote=False,
                source="indeed",
                source_url="https://indeed.com/job/1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Django Developer",
                company="Web Agency",
                location="Remote",
                description="Django web development",
                requirements=["Django"],
                benefits=["Remote work"],
                job_type="full-time",
                remote=True,
                source="remote_ok",
                source_url="https://remoteok.io/job/2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
    
    @pytest.fixture
    def user_profile(self):
        """Create sample user profile."""
        return {
            'job_titles': ['Python Developer', 'Django Developer'],
            'keywords': ['Python', 'Django', 'Web Development'],
            'locations': ['San Francisco', 'Remote'],
            'remote_ok': True,
            'salary_range': {'min': 80000, 'max': 120000},
            'experience_level': 'mid-level'
        }
    
    def test_pipeline_initialization(self):
        """Test pipeline initialization."""
        with patch('ai.job_processor.AIJobProcessor') as mock_ai_class:
            pipeline = JobProcessingPipeline(ai_provider="openai")
            
            mock_ai_class.assert_called_once_with(preferred_provider="openai")
            assert pipeline.stats['jobs_processed'] == 0
            assert pipeline.stats['jobs_enhanced'] == 0
    
    @pytest.mark.asyncio
    async def test_validate_and_clean_jobs(self, sample_jobs):
        """Test job validation and cleaning."""
        with patch('ai.job_processor.AIJobProcessor'):
            pipeline = JobProcessingPipeline()
            
            # Mock data processor
            pipeline.data_processor.validate_job_data = Mock(return_value=(True, []))
            pipeline.data_processor.clean_text = Mock(side_effect=lambda x: x.strip())
            pipeline.data_processor.normalize_job_type = Mock(side_effect=lambda x: x)
            pipeline.data_processor.detect_remote_work = Mock(return_value=False)
            
            validated_jobs = await pipeline._validate_and_clean_jobs(sample_jobs)
            
            assert len(validated_jobs) == 2
            assert all(isinstance(job, JobData) for job in validated_jobs)
    
    @pytest.mark.asyncio
    async def test_validate_and_clean_jobs_with_invalid_job(self, sample_jobs):
        """Test job validation with invalid job."""
        with patch('ai.job_processor.AIJobProcessor'):
            pipeline = JobProcessingPipeline()
            
            # Mock data processor to reject first job
            def mock_validate(job_dict):
                if "Python Developer" in job_dict.get('title', ''):
                    return False, ["Title too short"]
                return True, []
            
            pipeline.data_processor.validate_job_data = Mock(side_effect=mock_validate)
            pipeline.data_processor.clean_text = Mock(side_effect=lambda x: x.strip())
            pipeline.data_processor.normalize_job_type = Mock(side_effect=lambda x: x)
            pipeline.data_processor.detect_remote_work = Mock(return_value=False)
            
            validated_jobs = await pipeline._validate_and_clean_jobs(sample_jobs)
            
            # Should only have the Django Developer job
            assert len(validated_jobs) == 1
            assert validated_jobs[0].title == "Django Developer"
    
    @pytest.mark.asyncio
    async def test_enhance_jobs_with_ai(self, sample_jobs, user_profile, mock_ai_processor):
        """Test AI enhancement of jobs."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            enhanced_jobs = await pipeline._enhance_jobs_with_ai(sample_jobs, user_profile)
            
            assert len(enhanced_jobs) == 2
            assert all(isinstance(job, EnhancedJobData) for job in enhanced_jobs)
            assert all(job.processing_status == 'completed' for job in enhanced_jobs)
            assert all(job.ai_analysis is not None for job in enhanced_jobs)
            
            # Check that AI analysis was applied
            for job in enhanced_jobs:
                assert job.relevance_score == 0.75  # From mock analysis
                assert job.ai_summary == "Good Python role"
    
    @pytest.mark.asyncio
    async def test_enhance_jobs_with_ai_failure(self, sample_jobs, user_profile):
        """Test AI enhancement with failure."""
        mock_ai_processor = AsyncMock()
        mock_ai_processor.batch_analyze_jobs.side_effect = Exception("AI service down")
        
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            enhanced_jobs = await pipeline._enhance_jobs_with_ai(sample_jobs, user_profile)
            
            assert len(enhanced_jobs) == 2
            assert all(isinstance(job, EnhancedJobData) for job in enhanced_jobs)
            assert all(job.processing_status == 'failed' for job in enhanced_jobs)
            assert all(job.ai_analysis is None for job in enhanced_jobs)
            assert all(job.relevance_score == 0.5 for job in enhanced_jobs)  # Default fallback
    
    @pytest.mark.asyncio
    async def test_post_process_jobs(self, sample_jobs, user_profile, mock_ai_processor):
        """Test post-processing of enhanced jobs."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            # Create enhanced jobs with different relevance scores
            enhanced_jobs = []
            for i, job in enumerate(sample_jobs):
                enhanced_job = EnhancedJobData(
                    title=job.title,
                    company=job.company,
                    location=job.location,
                    description=job.description,
                    requirements=job.requirements,
                    benefits=job.benefits,
                    job_type=job.job_type,
                    remote=job.remote,
                    source=job.source,
                    source_url=job.source_url,
                    posted_date=job.posted_date,
                    discovered_date=job.discovered_date,
                    relevance_score=0.9 - (i * 0.2),  # Different scores for sorting test
                    processing_status="completed"
                )
                enhanced_jobs.append(enhanced_job)
            
            processed_jobs = await pipeline._post_process_jobs(enhanced_jobs)
            
            # Should be sorted by relevance score (highest first)
            assert processed_jobs[0].relevance_score > processed_jobs[1].relevance_score
            
            # Should have rank assigned
            assert processed_jobs[0].rank == 1
            assert processed_jobs[1].rank == 2
    
    @pytest.mark.asyncio
    async def test_process_jobs_complete_pipeline(self, sample_jobs, user_profile, mock_ai_processor):
        """Test complete job processing pipeline."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            # Mock data processor
            pipeline.data_processor.validate_job_data = Mock(return_value=(True, []))
            pipeline.data_processor.clean_text = Mock(side_effect=lambda x: x.strip())
            pipeline.data_processor.normalize_job_type = Mock(side_effect=lambda x: x)
            pipeline.data_processor.detect_remote_work = Mock(return_value=False)
            
            # Mock AI processor to return multiple analyses
            mock_ai_processor.batch_analyze_jobs.return_value = [
                JobAnalysis(
                    relevance_score=0.9,
                    summary="Excellent match",
                    extracted_requirements=["Python"],
                    extracted_benefits=["Health"],
                    match_reasons=["Perfect fit"],
                    concerns=[],
                    salary_estimate={"min": 100000, "max": 140000, "currency": "USD"}
                ),
                JobAnalysis(
                    relevance_score=0.7,
                    summary="Good match",
                    extracted_requirements=["Django"],
                    extracted_benefits=["Remote"],
                    match_reasons=["Django skills"],
                    concerns=["Junior level"],
                    salary_estimate=None
                )
            ]
            
            processed_jobs = await pipeline.process_jobs(sample_jobs, user_profile)
            
            assert len(processed_jobs) == 2
            assert all(isinstance(job, EnhancedJobData) for job in processed_jobs)
            
            # Should be sorted by relevance (highest first)
            assert processed_jobs[0].relevance_score == 0.9
            assert processed_jobs[1].relevance_score == 0.7
            
            # Check stats
            stats = pipeline.get_processing_stats()
            assert stats['jobs_processed'] == 2
            assert stats['jobs_enhanced'] == 2
            assert stats['processing_errors'] == 0
    
    @pytest.mark.asyncio
    async def test_process_single_job(self, sample_jobs, user_profile, mock_ai_processor):
        """Test processing a single job."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            # Mock data processor
            pipeline.data_processor.validate_job_data = Mock(return_value=(True, []))
            
            # Mock AI processor
            mock_analysis = JobAnalysis(
                relevance_score=0.85,
                summary="Great opportunity",
                extracted_requirements=["Python", "FastAPI"],
                extracted_benefits=["Stock options"],
                match_reasons=["Tech stack match"],
                concerns=["Startup risk"],
                salary_estimate={"min": 95000, "max": 125000, "currency": "USD"}
            )
            mock_ai_processor.analyze_job.return_value = mock_analysis
            
            enhanced_job = await pipeline.process_single_job(sample_jobs[0], user_profile)
            
            assert isinstance(enhanced_job, EnhancedJobData)
            assert enhanced_job.relevance_score == 0.85
            assert enhanced_job.ai_summary == "Great opportunity"
            assert enhanced_job.processing_status == "completed"
            assert enhanced_job.ai_analysis == mock_analysis
    
    @pytest.mark.asyncio
    async def test_process_single_job_validation_failure(self, sample_jobs, user_profile, mock_ai_processor):
        """Test processing a single job with validation failure."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            # Mock data processor to fail validation
            pipeline.data_processor.validate_job_data = Mock(return_value=(False, ["Invalid job"]))
            
            enhanced_job = await pipeline.process_single_job(sample_jobs[0], user_profile)
            
            assert isinstance(enhanced_job, EnhancedJobData)
            assert enhanced_job.relevance_score == 0.5  # Fallback score
            assert enhanced_job.processing_status == "failed"
            assert enhanced_job.ai_analysis is None
    
    def test_get_processing_stats(self, mock_ai_processor):
        """Test getting processing statistics."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            # Set some stats
            pipeline.stats['jobs_processed'] = 10
            pipeline.stats['jobs_enhanced'] = 8
            pipeline.stats['processing_errors'] = 2
            pipeline.stats['start_time'] = datetime.now()
            pipeline.stats['end_time'] = datetime.now()
            
            stats = pipeline.get_processing_stats()
            
            assert stats['jobs_processed'] == 10
            assert stats['jobs_enhanced'] == 8
            assert stats['processing_errors'] == 2
            assert 'processing_duration' in stats
            assert 'ai_provider' in stats
    
    @pytest.mark.asyncio
    async def test_generate_processing_report(self, mock_ai_processor):
        """Test generating processing report."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            # Create sample enhanced jobs
            enhanced_jobs = [
                EnhancedJobData(
                    title="Python Dev 1",
                    company="Company 1",
                    location="SF",
                    description="Python role",
                    requirements=[],
                    benefits=[],
                    job_type="full-time",
                    remote=True,
                    source="indeed",
                    source_url="https://indeed.com/1",
                    posted_date=datetime.now(),
                    discovered_date=datetime.now(),
                    relevance_score=0.9,
                    processing_status="completed"
                ),
                EnhancedJobData(
                    title="Django Dev 1",
                    company="Company 2",
                    location="Remote",
                    description="Django role",
                    requirements=[],
                    benefits=[],
                    job_type="full-time",
                    remote=True,
                    source="remote_ok",
                    source_url="https://remoteok.io/1",
                    posted_date=datetime.now(),
                    discovered_date=datetime.now(),
                    relevance_score=0.6,
                    processing_status="completed"
                ),
                EnhancedJobData(
                    title="Failed Job",
                    company="Company 3",
                    location="NYC",
                    description="Failed processing",
                    requirements=[],
                    benefits=[],
                    job_type="full-time",
                    remote=False,
                    source="linkedin",
                    source_url="https://linkedin.com/1",
                    posted_date=datetime.now(),
                    discovered_date=datetime.now(),
                    relevance_score=0.5,
                    processing_status="failed"
                )
            ]
            
            report = await pipeline.generate_processing_report(enhanced_jobs)
            
            assert report['summary']['total_jobs'] == 3
            assert report['summary']['successful_analyses'] == 2
            assert report['summary']['failed_analyses'] == 1
            assert abs(report['summary']['success_rate'] - 66.67) < 0.1  # 2/3 * 100, approximately
            
            assert report['relevance_analysis']['high_relevance_jobs'] == 1  # Score >= 0.7
            assert report['source_distribution']['indeed'] == 1
            assert report['source_distribution']['remote_ok'] == 1
            assert report['source_distribution']['linkedin'] == 1
            
            assert report['remote_work']['remote_jobs'] == 2
            assert report['remote_work']['remote_percentage'] == 66.7  # 2/3 * 100
    
    @pytest.mark.asyncio
    async def test_generate_processing_report_empty_jobs(self, mock_ai_processor):
        """Test generating processing report with no jobs."""
        with patch('ai.job_processor.AIJobProcessor', return_value=mock_ai_processor):
            pipeline = JobProcessingPipeline()
            
            report = await pipeline.generate_processing_report([])
            
            assert 'error' in report
            assert report['error'] == 'No jobs to analyze'

if __name__ == "__main__":
    pytest.main([__file__])