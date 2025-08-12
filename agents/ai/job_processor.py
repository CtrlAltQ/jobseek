"""
Job Processing Pipeline

This module integrates AI analysis with job scraping to provide intelligent
job processing, scoring, and enhancement.
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import asdict

from agents.ai.ai_client import AIJobProcessor, JobAnalysis
from agents.scrapers.base_scraper import JobData
from agents.utils.data_utils import JobDataProcessor

logger = logging.getLogger(__name__)

class EnhancedJobData(JobData):
    """Extended JobData with AI analysis results."""
    
    def __init__(self, *args, **kwargs):
        # Extract AI-specific fields
        self.ai_analysis: Optional[JobAnalysis] = kwargs.pop('ai_analysis', None)
        self.processing_status: str = kwargs.pop('processing_status', 'pending')
        self.processing_timestamp: Optional[datetime] = kwargs.pop('processing_timestamp', None)
        
        # Initialize base JobData
        super().__init__(*args, **kwargs)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary including AI analysis."""
        base_dict = super().to_dict()
        
        # Add AI analysis if available
        if self.ai_analysis:
            base_dict['ai_analysis'] = {
                'relevance_score': self.ai_analysis.relevance_score,
                'summary': self.ai_analysis.summary,
                'extracted_requirements': self.ai_analysis.extracted_requirements,
                'extracted_benefits': self.ai_analysis.extracted_benefits,
                'match_reasons': self.ai_analysis.match_reasons,
                'concerns': self.ai_analysis.concerns,
                'salary_estimate': self.ai_analysis.salary_estimate
            }
            
            # Update base fields with AI-enhanced data
            if self.ai_analysis.summary and not base_dict.get('ai_summary'):
                base_dict['ai_summary'] = self.ai_analysis.summary
            
            if self.ai_analysis.extracted_requirements:
                base_dict['requirements'].extend(self.ai_analysis.extracted_requirements)
                # Remove duplicates while preserving order
                base_dict['requirements'] = list(dict.fromkeys(base_dict['requirements']))
            
            if self.ai_analysis.extracted_benefits:
                base_dict['benefits'].extend(self.ai_analysis.extracted_benefits)
                # Remove duplicates while preserving order
                base_dict['benefits'] = list(dict.fromkeys(base_dict['benefits']))
            
            # Update relevance score
            base_dict['relevance_score'] = self.ai_analysis.relevance_score
        
        # Add processing metadata
        base_dict['processing_status'] = self.processing_status
        if self.processing_timestamp:
            base_dict['processing_timestamp'] = self.processing_timestamp.isoformat()
        
        return base_dict

class JobProcessingPipeline:
    """Complete job processing pipeline with AI enhancement."""
    
    def __init__(self, ai_provider: str = "openai"):
        """
        Initialize the processing pipeline.
        
        Args:
            ai_provider: AI provider to use ("openai" or "anthropic")
        """
        self.ai_processor = AIJobProcessor(preferred_provider=ai_provider)
        self.data_processor = JobDataProcessor()
        self.stats = {
            'jobs_processed': 0,
            'jobs_enhanced': 0,
            'processing_errors': 0,
            'start_time': None,
            'end_time': None
        }
        
        logger.info(f"Job processing pipeline initialized with {ai_provider}")
    
    async def process_jobs(self, jobs: List[JobData], user_profile: Dict) -> List[EnhancedJobData]:
        """
        Process a list of jobs with AI enhancement.
        
        Args:
            jobs: List of JobData objects from scrapers
            user_profile: User preferences for AI analysis
            
        Returns:
            List of EnhancedJobData objects with AI analysis
        """
        self.stats['start_time'] = datetime.now()
        self.stats['jobs_processed'] = len(jobs)
        
        logger.info(f"Starting processing pipeline for {len(jobs)} jobs")
        
        try:
            # Step 1: Data validation and cleaning
            validated_jobs = await self._validate_and_clean_jobs(jobs)
            logger.info(f"Validated {len(validated_jobs)} jobs")
            
            # Step 2: AI analysis
            enhanced_jobs = await self._enhance_jobs_with_ai(validated_jobs, user_profile)
            logger.info(f"Enhanced {len(enhanced_jobs)} jobs with AI analysis")
            
            # Step 3: Post-processing and ranking
            final_jobs = await self._post_process_jobs(enhanced_jobs)
            logger.info(f"Post-processed {len(final_jobs)} jobs")
            
            self.stats['jobs_enhanced'] = len(final_jobs)
            self.stats['end_time'] = datetime.now()
            
            logger.info(f"Processing pipeline complete: {len(final_jobs)} jobs ready")
            return final_jobs
            
        except Exception as e:
            logger.error(f"Processing pipeline failed: {str(e)}")
            self.stats['processing_errors'] += 1
            self.stats['end_time'] = datetime.now()
            
            # Return jobs without AI enhancement as fallback
            return [self._create_fallback_enhanced_job(job) for job in jobs]
    
    async def _validate_and_clean_jobs(self, jobs: List[JobData]) -> List[JobData]:
        """Validate and clean job data."""
        validated_jobs = []
        
        for job in jobs:
            try:
                # Convert to dict for validation
                job_dict = job.to_dict()
                
                # Validate job data
                is_valid, errors = self.data_processor.validate_job_data(job_dict)
                
                if is_valid:
                    # Clean and normalize data
                    job.title = self.data_processor.clean_text(job.title)
                    job.company = self.data_processor.clean_text(job.company)
                    job.location = self.data_processor.clean_text(job.location)
                    job.description = self.data_processor.clean_text(job.description)
                    job.job_type = self.data_processor.normalize_job_type(job.job_type)
                    
                    # Detect remote work if not already set
                    if not job.remote:
                        job.remote = self.data_processor.detect_remote_work(
                            f"{job.title} {job.description} {job.location}"
                        )
                    
                    validated_jobs.append(job)
                else:
                    logger.warning(f"Job validation failed: {job.title} - {errors}")
                    
            except Exception as e:
                logger.error(f"Job validation error: {str(e)}")
                continue
        
        return validated_jobs
    
    async def _enhance_jobs_with_ai(self, jobs: List[JobData], user_profile: Dict) -> List[EnhancedJobData]:
        """Enhance jobs with AI analysis."""
        enhanced_jobs = []
        
        try:
            # Convert jobs to dictionaries for AI processing
            job_dicts = [job.to_dict() for job in jobs]
            
            # Batch analyze jobs
            analyses = await self.ai_processor.batch_analyze_jobs(job_dicts, user_profile)
            
            # Create enhanced job objects
            for job, analysis in zip(jobs, analyses):
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
                    relevance_score=analysis.relevance_score,
                    status=job.status,
                    ai_summary=analysis.summary,
                    salary_min=job.salary_min,
                    salary_max=job.salary_max,
                    salary_currency=job.salary_currency,
                    ai_analysis=analysis,
                    processing_status='completed',
                    processing_timestamp=datetime.now()
                )
                
                enhanced_jobs.append(enhanced_job)
                
        except Exception as e:
            logger.error(f"AI enhancement failed: {str(e)}")
            # Create fallback enhanced jobs
            for job in jobs:
                enhanced_jobs.append(self._create_fallback_enhanced_job(job))
        
        return enhanced_jobs
    
    def _create_fallback_enhanced_job(self, job: JobData) -> EnhancedJobData:
        """Create enhanced job without AI analysis as fallback."""
        return EnhancedJobData(
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
            relevance_score=0.5,  # Default relevance
            status=job.status,
            ai_summary=None,
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            salary_currency=job.salary_currency,
            ai_analysis=None,
            processing_status='failed',
            processing_timestamp=datetime.now()
        )
    
    async def _post_process_jobs(self, jobs: List[EnhancedJobData]) -> List[EnhancedJobData]:
        """Post-process jobs with ranking and additional enhancements."""
        # Sort by relevance score (highest first)
        jobs.sort(key=lambda x: x.relevance_score, reverse=True)
        
        # Add ranking information
        for i, job in enumerate(jobs):
            job.rank = i + 1
        
        # Additional processing could include:
        # - Salary normalization
        # - Location standardization
        # - Company information enrichment
        # - Duplicate detection refinement
        
        return jobs
    
    async def process_single_job(self, job: JobData, user_profile: Dict) -> EnhancedJobData:
        """
        Process a single job with AI enhancement.
        
        Args:
            job: JobData object
            user_profile: User preferences
            
        Returns:
            EnhancedJobData object with AI analysis
        """
        try:
            # Validate and clean
            job_dict = job.to_dict()
            is_valid, errors = self.data_processor.validate_job_data(job_dict)
            
            if not is_valid:
                logger.warning(f"Job validation failed: {errors}")
                return self._create_fallback_enhanced_job(job)
            
            # AI analysis
            analysis = await self.ai_processor.analyze_job(job_dict, user_profile)
            
            # Create enhanced job
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
                relevance_score=analysis.relevance_score,
                status=job.status,
                ai_summary=analysis.summary,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                salary_currency=job.salary_currency,
                ai_analysis=analysis,
                processing_status='completed',
                processing_timestamp=datetime.now()
            )
            
            return enhanced_job
            
        except Exception as e:
            logger.error(f"Single job processing failed: {str(e)}")
            return self._create_fallback_enhanced_job(job)
    
    def get_processing_stats(self) -> Dict:
        """Get processing pipeline statistics."""
        stats = self.stats.copy()
        
        if stats['start_time'] and stats['end_time']:
            duration = stats['end_time'] - stats['start_time']
            stats['processing_duration'] = duration.total_seconds()
            
            if stats['jobs_processed'] > 0:
                stats['jobs_per_second'] = stats['jobs_processed'] / duration.total_seconds()
        
        # Add AI provider info
        stats['ai_provider'] = self.ai_processor.get_provider_info()
        
        return stats
    
    async def generate_processing_report(self, jobs: List[EnhancedJobData]) -> Dict:
        """Generate a comprehensive processing report."""
        if not jobs:
            return {'error': 'No jobs to analyze'}
        
        # Calculate statistics
        total_jobs = len(jobs)
        successful_analyses = len([j for j in jobs if j.processing_status == 'completed'])
        failed_analyses = len([j for j in jobs if j.processing_status == 'failed'])
        
        # Relevance score distribution
        scores = [j.relevance_score for j in jobs if j.relevance_score is not None]
        avg_relevance = sum(scores) / len(scores) if scores else 0
        high_relevance_jobs = len([s for s in scores if s >= 0.7])
        
        # Source distribution
        source_counts = {}
        for job in jobs:
            source = job.source
            source_counts[source] = source_counts.get(source, 0) + 1
        
        # Remote work statistics
        remote_jobs = len([j for j in jobs if j.remote])
        remote_percentage = (remote_jobs / total_jobs) * 100 if total_jobs > 0 else 0
        
        return {
            'summary': {
                'total_jobs': total_jobs,
                'successful_analyses': successful_analyses,
                'failed_analyses': failed_analyses,
                'success_rate': (successful_analyses / total_jobs) * 100 if total_jobs > 0 else 0
            },
            'relevance_analysis': {
                'average_relevance_score': round(avg_relevance, 3),
                'high_relevance_jobs': high_relevance_jobs,
                'high_relevance_percentage': (high_relevance_jobs / total_jobs) * 100 if total_jobs > 0 else 0
            },
            'source_distribution': source_counts,
            'remote_work': {
                'remote_jobs': remote_jobs,
                'remote_percentage': round(remote_percentage, 1)
            },
            'processing_stats': self.get_processing_stats()
        }