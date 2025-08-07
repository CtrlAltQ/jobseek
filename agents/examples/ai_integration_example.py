"""
AI Integration Example

This example demonstrates how to integrate the AI processing pipeline
with job scrapers to create an intelligent job discovery system.
"""

import asyncio
import logging
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.scraper_orchestrator import ScraperOrchestrator
from ai.job_processor import JobProcessingPipeline
from scrapers.base_scraper import JobData

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class IntelligentJobFinder:
    """Complete intelligent job finding system with AI enhancement."""
    
    def __init__(self, scraper_config: dict = None, ai_provider: str = "openai"):
        """
        Initialize the intelligent job finder.
        
        Args:
            scraper_config: Configuration for scrapers
            ai_provider: AI provider to use ("openai" or "anthropic")
        """
        self.scraper_orchestrator = ScraperOrchestrator(scraper_config)
        self.ai_pipeline = JobProcessingPipeline(ai_provider=ai_provider)
        
        logger.info("Intelligent Job Finder initialized")
    
    async def find_and_analyze_jobs(self, search_params: dict, user_profile: dict) -> dict:
        """
        Complete job finding and analysis workflow.
        
        Args:
            search_params: Search parameters for scrapers
            user_profile: User profile for AI analysis
            
        Returns:
            Dictionary with enhanced job results and analysis
        """
        logger.info("Starting intelligent job discovery workflow")
        
        try:
            # Step 1: Scrape jobs from multiple sources
            logger.info("Phase 1: Scraping jobs from multiple sources")
            scraping_results = await self.scraper_orchestrator.scrape_all_sources(search_params)
            
            raw_jobs = scraping_results['jobs']
            logger.info(f"Scraped {len(raw_jobs)} jobs from {len(self.scraper_orchestrator.scrapers)} sources")
            
            if not raw_jobs:
                logger.warning("No jobs found during scraping")
                return {
                    'enhanced_jobs': [],
                    'scraping_results': scraping_results,
                    'ai_analysis': {'error': 'No jobs to analyze'},
                    'recommendations': []
                }
            
            # Step 2: AI enhancement and analysis
            logger.info("Phase 2: AI enhancement and analysis")
            enhanced_jobs = await self.ai_pipeline.process_jobs(raw_jobs, user_profile)
            
            logger.info(f"Enhanced {len(enhanced_jobs)} jobs with AI analysis")
            
            # Step 3: Generate insights and recommendations
            logger.info("Phase 3: Generating insights and recommendations")
            processing_report = await self.ai_pipeline.generate_processing_report(enhanced_jobs)
            recommendations = self._generate_recommendations(enhanced_jobs, user_profile)
            
            # Compile final results
            results = {
                'enhanced_jobs': [job.to_dict() for job in enhanced_jobs],
                'scraping_results': scraping_results,
                'ai_analysis': processing_report,
                'recommendations': recommendations,
                'summary': {
                    'total_jobs_scraped': len(raw_jobs),
                    'jobs_successfully_enhanced': len([j for j in enhanced_jobs if j.processing_status == 'completed']),
                    'average_relevance_score': sum(j.relevance_score for j in enhanced_jobs) / len(enhanced_jobs) if enhanced_jobs else 0,
                    'high_relevance_jobs': len([j for j in enhanced_jobs if j.relevance_score >= 0.7]),
                    'sources_used': list(scraping_results['stats'].keys()),
                    'processing_time': processing_report.get('processing_stats', {}).get('processing_duration', 0)
                }
            }
            
            logger.info("Intelligent job discovery workflow completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Intelligent job discovery failed: {str(e)}")
            raise
    
    def _generate_recommendations(self, enhanced_jobs: list, user_profile: dict) -> list:
        """Generate personalized job recommendations."""
        recommendations = []
        
        if not enhanced_jobs:
            return recommendations
        
        # Sort jobs by relevance score
        sorted_jobs = sorted(enhanced_jobs, key=lambda x: x.relevance_score, reverse=True)
        
        # Top recommendations
        top_jobs = sorted_jobs[:5]
        if top_jobs:
            recommendations.append({
                'type': 'top_matches',
                'title': 'Top Job Matches',
                'description': f'Based on your profile, these {len(top_jobs)} jobs are the best matches',
                'jobs': [
                    {
                        'title': job.title,
                        'company': job.company,
                        'relevance_score': job.relevance_score,
                        'match_reasons': job.ai_analysis.match_reasons if job.ai_analysis else [],
                        'url': job.source_url
                    }
                    for job in top_jobs
                ]
            })
        
        # Remote work opportunities
        remote_jobs = [job for job in enhanced_jobs if job.remote and job.relevance_score >= 0.6]
        if remote_jobs and user_profile.get('remote_ok', False):
            recommendations.append({
                'type': 'remote_opportunities',
                'title': 'Remote Work Opportunities',
                'description': f'Found {len(remote_jobs)} remote positions that match your preferences',
                'jobs': [
                    {
                        'title': job.title,
                        'company': job.company,
                        'relevance_score': job.relevance_score,
                        'url': job.source_url
                    }
                    for job in remote_jobs[:3]
                ]
            })
        
        # High-paying opportunities
        high_salary_jobs = [
            job for job in enhanced_jobs 
            if job.ai_analysis and job.ai_analysis.salary_estimate 
            and job.ai_analysis.salary_estimate.get('min', 0) >= user_profile.get('salary_range', {}).get('min', 0)
        ]
        if high_salary_jobs:
            recommendations.append({
                'type': 'high_salary',
                'title': 'High-Paying Opportunities',
                'description': f'Found {len(high_salary_jobs)} positions that meet your salary expectations',
                'jobs': [
                    {
                        'title': job.title,
                        'company': job.company,
                        'salary_estimate': job.ai_analysis.salary_estimate,
                        'relevance_score': job.relevance_score,
                        'url': job.source_url
                    }
                    for job in high_salary_jobs[:3]
                ]
            })
        
        # Skills development opportunities
        skill_keywords = user_profile.get('keywords', [])
        if skill_keywords:
            skill_match_jobs = [
                job for job in enhanced_jobs
                if job.ai_analysis and any(
                    skill.lower() in ' '.join(job.ai_analysis.extracted_requirements).lower()
                    for skill in skill_keywords
                )
            ]
            if skill_match_jobs:
                recommendations.append({
                    'type': 'skill_development',
                    'title': 'Skills Development Opportunities',
                    'description': f'Positions that align with your target skills: {", ".join(skill_keywords)}',
                    'jobs': [
                        {
                            'title': job.title,
                            'company': job.company,
                            'matching_skills': [
                                req for req in job.ai_analysis.extracted_requirements
                                if any(skill.lower() in req.lower() for skill in skill_keywords)
                            ],
                            'relevance_score': job.relevance_score,
                            'url': job.source_url
                        }
                        for job in skill_match_jobs[:3]
                    ]
                })
        
        return recommendations

async def main():
    """Example usage of the intelligent job finder."""
    
    # Configuration
    scraper_config = {
        'sources': {
            'indeed': {'enabled': True},
            'linkedin': {'enabled': False},  # Disabled for demo
            'remote_ok': {'enabled': True},
            'weworkremotely': {'enabled': True}
        },
        'companies': [],  # No company scrapers for demo
        'max_retries': 1,
        'retry_delay': 2
    }
    
    # Search parameters
    search_params = {
        'job_titles': ['Python Developer', 'Software Engineer'],
        'keywords': ['Python', 'Django', 'FastAPI'],
        'locations': ['Remote', 'San Francisco'],
        'remote_ok': True,
        'job_type': 'full-time',
        'days_back': 7,
        'max_pages': 1  # Limited for demo
    }
    
    # User profile for AI analysis
    user_profile = {
        'job_titles': ['Python Developer', 'Backend Developer'],
        'keywords': ['Python', 'Django', 'PostgreSQL', 'API'],
        'locations': ['Remote', 'San Francisco', 'New York'],
        'remote_ok': True,
        'salary_range': {'min': 80000, 'max': 130000},
        'experience_level': 'mid-level',
        'preferred_company_size': 'startup'
    }
    
    try:
        # Initialize intelligent job finder
        # Note: This will fail without proper API keys, so we'll create a demo version
        print("🚀 Intelligent Job Finder Demo")
        print("=" * 50)
        
        # Create demo jobs for illustration (since we don't have API keys)
        demo_jobs = [
            JobData(
                title="Senior Python Developer",
                company="TechCorp",
                location="Remote",
                description="Build scalable Python applications using Django and PostgreSQL. Work with a dynamic team on cutting-edge projects.",
                requirements=["Python", "Django", "PostgreSQL"],
                benefits=["Health insurance", "Remote work", "Stock options"],
                job_type="full-time",
                remote=True,
                source="indeed",
                source_url="https://indeed.com/job/demo1",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            ),
            JobData(
                title="Python Backend Engineer",
                company="StartupXYZ",
                location="San Francisco, CA",
                description="Join our fast-growing startup to build APIs and microservices. Experience with FastAPI preferred.",
                requirements=["Python", "FastAPI", "Docker"],
                benefits=["Competitive salary", "Equity", "Flexible hours"],
                job_type="full-time",
                remote=False,
                source="remote_ok",
                source_url="https://remoteok.io/job/demo2",
                posted_date=datetime.now(),
                discovered_date=datetime.now()
            )
        ]
        
        print(f"📊 Demo: Found {len(demo_jobs)} sample jobs")
        print("\nJobs found:")
        for i, job in enumerate(demo_jobs, 1):
            print(f"  {i}. {job.title} at {job.company} ({job.location})")
        
        print(f"\n🤖 AI Analysis would enhance these jobs with:")
        print("  • Relevance scoring based on your profile")
        print("  • Extracted requirements and benefits")
        print("  • Match explanations and concerns")
        print("  • Salary estimates where missing")
        print("  • Personalized recommendations")
        
        print(f"\n📈 Expected AI enhancements:")
        print("  • Job relevance scores: 0.0 - 1.0")
        print("  • Requirement extraction from descriptions")
        print("  • Benefit identification and categorization")
        print("  • Salary estimation using market data")
        print("  • Match reasoning and concern identification")
        
        print(f"\n🎯 Personalized recommendations would include:")
        print("  • Top 5 matches based on relevance")
        print("  • Remote work opportunities (if preferred)")
        print("  • High-paying positions meeting salary expectations")
        print("  • Skills development opportunities")
        
        print(f"\n✅ AI Processing Pipeline Features:")
        print("  • Concurrent processing of multiple jobs")
        print("  • Fallback handling for API failures")
        print("  • Comprehensive error handling and retry logic")
        print("  • Detailed analytics and reporting")
        print("  • Support for both OpenAI and Anthropic")
        
        print(f"\n🔧 To enable full AI processing:")
        print("  1. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in environment")
        print("  2. Run: job_finder = IntelligentJobFinder()")
        print("  3. Run: results = await job_finder.find_and_analyze_jobs(search_params, user_profile)")
        
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")
        print("This is expected without proper API keys configured.")

if __name__ == "__main__":
    asyncio.run(main())