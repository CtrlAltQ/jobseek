"""
AI Client for Job Processing

This module provides AI-powered job analysis using OpenAI and Anthropic APIs.
It handles job relevance scoring, requirement extraction, and summary generation.
"""

import asyncio
import logging
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
import json
import re

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import OPENAI_API_KEY, ANTHROPIC_API_KEY

# Import AI clients
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class JobAnalysis:
    """Results of AI job analysis."""
    relevance_score: float  # 0.0 to 1.0
    summary: str
    extracted_requirements: List[str]
    extracted_benefits: List[str]
    match_reasons: List[str]
    concerns: List[str]
    salary_estimate: Optional[Dict[str, Union[str, float]]] = None

class AIJobProcessor:
    """AI-powered job processing and analysis."""
    
    def __init__(self, preferred_provider: str = "openai"):
        """
        Initialize AI processor.
        
        Args:
            preferred_provider: "openai" or "anthropic"
        """
        self.preferred_provider = preferred_provider
        self.openai_client = None
        self.anthropic_client = None
        
        # Initialize available clients
        if OPENAI_AVAILABLE and OPENAI_API_KEY:
            self.openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
            logger.info("OpenAI client initialized")
        
        if ANTHROPIC_AVAILABLE and ANTHROPIC_API_KEY:
            self.anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            logger.info("Anthropic client initialized")
        
        # Fallback logic
        if not self._has_available_client():
            raise ValueError("No AI provider available. Please configure OpenAI or Anthropic API keys.")
        
        # Set active client
        self.active_provider = self._get_active_provider()
        logger.info(f"Using {self.active_provider} as AI provider")
    
    def _has_available_client(self) -> bool:
        """Check if any AI client is available."""
        return (self.openai_client is not None) or (self.anthropic_client is not None)
    
    def _get_active_provider(self) -> str:
        """Get the active AI provider."""
        if self.preferred_provider == "openai" and self.openai_client:
            return "openai"
        elif self.preferred_provider == "anthropic" and self.anthropic_client:
            return "anthropic"
        elif self.openai_client:
            return "openai"
        elif self.anthropic_client:
            return "anthropic"
        else:
            raise ValueError("No AI provider available")
    
    async def analyze_job(self, job_data: Dict, user_profile: Dict) -> JobAnalysis:
        """
        Perform comprehensive AI analysis of a job posting.
        
        Args:
            job_data: Job information dictionary
            user_profile: User preferences and profile
            
        Returns:
            JobAnalysis object with AI-generated insights
        """
        try:
            logger.info(f"Analyzing job: {job_data.get('title', 'Unknown')} at {job_data.get('company', 'Unknown')}")
            
            # Create analysis prompt
            prompt = self._create_analysis_prompt(job_data, user_profile)
            
            # Get AI response
            if self.active_provider == "openai":
                response = await self._analyze_with_openai(prompt)
            else:
                response = await self._analyze_with_anthropic(prompt)
            
            # Parse response into JobAnalysis
            analysis = self._parse_analysis_response(response)
            
            logger.info(f"Job analysis complete. Relevance score: {analysis.relevance_score:.2f}")
            return analysis
            
        except Exception as e:
            logger.error(f"Job analysis failed: {str(e)}")
            # Return default analysis on failure
            return JobAnalysis(
                relevance_score=0.5,
                summary=f"Analysis unavailable for {job_data.get('title', 'this position')}",
                extracted_requirements=[],
                extracted_benefits=[],
                match_reasons=[],
                concerns=["AI analysis failed"],
                salary_estimate=None
            )
    
    def _create_analysis_prompt(self, job_data: Dict, user_profile: Dict) -> str:
        """Create a comprehensive analysis prompt."""
        prompt = f"""
Analyze this job posting for relevance to the user profile and extract key information.

JOB POSTING:
Title: {job_data.get('title', 'N/A')}
Company: {job_data.get('company', 'N/A')}
Location: {job_data.get('location', 'N/A')}
Remote: {job_data.get('remote', False)}
Job Type: {job_data.get('job_type', 'N/A')}
Description: {job_data.get('description', 'N/A')}

USER PROFILE:
Preferred Job Titles: {user_profile.get('job_titles', [])}
Keywords: {user_profile.get('keywords', [])}
Preferred Locations: {user_profile.get('locations', [])}
Remote Preference: {user_profile.get('remote_ok', False)}
Salary Range: {user_profile.get('salary_range', 'Not specified')}
Experience Level: {user_profile.get('experience_level', 'Not specified')}

Please provide a JSON response with the following structure:
{{
    "relevance_score": 0.85,
    "summary": "Brief 2-3 sentence summary of the role and why it might be interesting",
    "extracted_requirements": ["Python", "3+ years experience", "Bachelor's degree"],
    "extracted_benefits": ["Health insurance", "401k", "Remote work"],
    "match_reasons": ["Matches preferred Python keyword", "Remote work available"],
    "concerns": ["Salary not specified", "May require more experience than preferred"],
    "salary_estimate": {{"min": 80000, "max": 120000, "currency": "USD", "confidence": "medium"}}
}}

Focus on:
1. How well the job matches the user's preferences (relevance_score 0.0-1.0)
2. Extract specific technical requirements and qualifications
3. Identify benefits and perks mentioned
4. Explain why this job is or isn't a good match
5. Note any concerns or red flags
6. Estimate salary if not provided (set to null if impossible to estimate)

Be honest about fit and highlight both positives and concerns.
"""
        return prompt
    
    async def _analyze_with_openai(self, prompt: str) -> str:
        """Analyze job using OpenAI."""
        try:
            response = await asyncio.to_thread(
                self.openai_client.chat.completions.create,
                model="gpt-4o-mini",  # Use the more cost-effective model
                messages=[
                    {"role": "system", "content": "You are an expert job market analyst and career advisor. Provide detailed, honest job analysis in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI analysis failed: {str(e)}")
            raise
    
    async def _analyze_with_anthropic(self, prompt: str) -> str:
        """Analyze job using Anthropic Claude."""
        try:
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model="claude-3-haiku-20240307",  # Use the more cost-effective model
                max_tokens=1000,
                temperature=0.3,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return response.content[0].text
            
        except Exception as e:
            logger.error(f"Anthropic analysis failed: {str(e)}")
            raise
    
    def _parse_analysis_response(self, response: str) -> JobAnalysis:
        """Parse AI response into JobAnalysis object."""
        try:
            # Extract JSON from response (in case there's extra text)
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
            else:
                json_str = response
            
            # Parse JSON
            data = json.loads(json_str)
            
            # Create JobAnalysis object
            return JobAnalysis(
                relevance_score=max(0.0, min(1.0, float(data.get('relevance_score', 0.5)))),
                summary=data.get('summary', 'No summary available'),
                extracted_requirements=data.get('extracted_requirements', []),
                extracted_benefits=data.get('extracted_benefits', []),
                match_reasons=data.get('match_reasons', []),
                concerns=data.get('concerns', []),
                salary_estimate=data.get('salary_estimate')
            )
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            logger.debug(f"Raw response: {response}")
            
            # Return fallback analysis
            return JobAnalysis(
                relevance_score=0.5,
                summary="Unable to parse AI analysis",
                extracted_requirements=[],
                extracted_benefits=[],
                match_reasons=[],
                concerns=["Analysis parsing failed"],
                salary_estimate=None
            )
    
    async def batch_analyze_jobs(self, jobs: List[Dict], user_profile: Dict, max_concurrent: int = 5) -> List[JobAnalysis]:
        """
        Analyze multiple jobs concurrently.
        
        Args:
            jobs: List of job data dictionaries
            user_profile: User preferences and profile
            max_concurrent: Maximum concurrent API calls
            
        Returns:
            List of JobAnalysis objects
        """
        logger.info(f"Starting batch analysis of {len(jobs)} jobs")
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def analyze_single_job(job_data):
            async with semaphore:
                return await self.analyze_job(job_data, user_profile)
        
        # Run analyses concurrently
        tasks = [analyze_single_job(job) for job in jobs]
        analyses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        results = []
        for i, analysis in enumerate(analyses):
            if isinstance(analysis, Exception):
                logger.error(f"Job {i} analysis failed: {str(analysis)}")
                # Create fallback analysis
                results.append(JobAnalysis(
                    relevance_score=0.5,
                    summary=f"Analysis failed for {jobs[i].get('title', 'this position')}",
                    extracted_requirements=[],
                    extracted_benefits=[],
                    match_reasons=[],
                    concerns=["Analysis failed"],
                    salary_estimate=None
                ))
            else:
                results.append(analysis)
        
        logger.info(f"Batch analysis complete. {len(results)} jobs analyzed")
        return results
    
    async def generate_job_summary(self, job_data: Dict) -> str:
        """
        Generate a concise job summary.
        
        Args:
            job_data: Job information dictionary
            
        Returns:
            AI-generated job summary
        """
        prompt = f"""
Summarize this job posting in 2-3 sentences. Focus on the key responsibilities, requirements, and what makes this role interesting.

Job Title: {job_data.get('title', 'N/A')}
Company: {job_data.get('company', 'N/A')}
Description: {job_data.get('description', 'N/A')}

Provide a concise, engaging summary that highlights the most important aspects of the role.
"""
        
        try:
            if self.active_provider == "openai":
                response = await asyncio.to_thread(
                    self.openai_client.chat.completions.create,
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a professional job summary writer. Create concise, engaging job summaries."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.5,
                    max_tokens=200
                )
                return response.choices[0].message.content.strip()
            else:
                response = await asyncio.to_thread(
                    self.anthropic_client.messages.create,
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    temperature=0.5,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text.strip()
                
        except Exception as e:
            logger.error(f"Summary generation failed: {str(e)}")
            return f"Summary unavailable for {job_data.get('title', 'this position')}"
    
    def get_provider_info(self) -> Dict:
        """Get information about available AI providers."""
        return {
            'active_provider': self.active_provider,
            'openai_available': self.openai_client is not None,
            'anthropic_available': self.anthropic_client is not None,
            'preferred_provider': self.preferred_provider
        }