"""
Tests for AI Client

This module contains tests for the AI job processing functionality.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch
import json

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.ai_client import AIJobProcessor, JobAnalysis

class TestJobAnalysis:
    """Test JobAnalysis data class."""
    
    def test_job_analysis_creation(self):
        """Test JobAnalysis creation."""
        analysis = JobAnalysis(
            relevance_score=0.85,
            summary="Great Python role",
            extracted_requirements=["Python", "Django"],
            extracted_benefits=["Health insurance"],
            match_reasons=["Python experience"],
            concerns=["Salary not specified"],
            salary_estimate={"min": 80000, "max": 120000, "currency": "USD"}
        )
        
        assert analysis.relevance_score == 0.85
        assert analysis.summary == "Great Python role"
        assert "Python" in analysis.extracted_requirements
        assert "Health insurance" in analysis.extracted_benefits
        assert analysis.salary_estimate["min"] == 80000

class TestAIJobProcessor:
    """Test AIJobProcessor functionality."""
    
    @pytest.fixture
    def mock_openai_client(self):
        """Create mock OpenAI client."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "relevance_score": 0.8,
            "summary": "Excellent Python developer role",
            "extracted_requirements": ["Python", "Django", "3+ years"],
            "extracted_benefits": ["Health insurance", "401k"],
            "match_reasons": ["Python expertise required"],
            "concerns": ["Remote work not mentioned"],
            "salary_estimate": {"min": 90000, "max": 130000, "currency": "USD", "confidence": "medium"}
        })
        mock_client.chat.completions.create.return_value = mock_response
        return mock_client
    
    @pytest.fixture
    def mock_anthropic_client(self):
        """Create mock Anthropic client."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = json.dumps({
            "relevance_score": 0.75,
            "summary": "Good backend developer position",
            "extracted_requirements": ["Python", "FastAPI"],
            "extracted_benefits": ["Remote work"],
            "match_reasons": ["Backend development focus"],
            "concerns": ["Junior level position"],
            "salary_estimate": None
        })
        mock_client.messages.create.return_value = mock_response
        return mock_client
    
    def test_processor_initialization_openai(self, mock_openai_client):
        """Test processor initialization with OpenAI."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor(preferred_provider="openai")
                    
                    assert processor.active_provider == "openai"
                    assert processor.openai_client == mock_openai_client
    
    def test_processor_initialization_anthropic(self, mock_anthropic_client):
        """Test processor initialization with Anthropic."""
        with patch('ai.ai_client.ANTHROPIC_AVAILABLE', True):
            with patch('ai.ai_client.ANTHROPIC_API_KEY', 'test-key'):
                with patch('ai.ai_client.anthropic.Anthropic', return_value=mock_anthropic_client):
                    processor = AIJobProcessor(preferred_provider="anthropic")
                    
                    assert processor.active_provider == "anthropic"
                    assert processor.anthropic_client == mock_anthropic_client
    
    def test_processor_initialization_no_api_keys(self):
        """Test processor initialization without API keys."""
        with patch('ai.ai_client.OPENAI_API_KEY', None):
            with patch('ai.ai_client.ANTHROPIC_API_KEY', None):
                with pytest.raises(ValueError, match="No AI provider available"):
                    AIJobProcessor()
    
    def test_create_analysis_prompt(self, mock_openai_client):
        """Test analysis prompt creation."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor()
                    
                    job_data = {
                        'title': 'Python Developer',
                        'company': 'Tech Corp',
                        'location': 'Remote',
                        'description': 'Python development role'
                    }
                    
                    user_profile = {
                        'job_titles': ['Python Developer'],
                        'keywords': ['Python', 'Django'],
                        'remote_ok': True
                    }
                    
                    prompt = processor._create_analysis_prompt(job_data, user_profile)
                    
                    assert 'Python Developer' in prompt
                    assert 'Tech Corp' in prompt
                    assert 'Remote' in prompt
                    assert 'relevance_score' in prompt
                    assert 'JSON' in prompt
    
    def test_parse_analysis_response_valid_json(self, mock_openai_client):
        """Test parsing valid JSON response."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor()
                    
                    response = json.dumps({
                        "relevance_score": 0.9,
                        "summary": "Perfect match",
                        "extracted_requirements": ["Python"],
                        "extracted_benefits": ["Remote"],
                        "match_reasons": ["Python skills"],
                        "concerns": [],
                        "salary_estimate": {"min": 100000, "max": 150000, "currency": "USD"}
                    })
                    
                    analysis = processor._parse_analysis_response(response)
                    
                    assert analysis.relevance_score == 0.9
                    assert analysis.summary == "Perfect match"
                    assert "Python" in analysis.extracted_requirements
                    assert analysis.salary_estimate["min"] == 100000
    
    def test_parse_analysis_response_invalid_json(self, mock_openai_client):
        """Test parsing invalid JSON response."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor()
                    
                    response = "This is not valid JSON"
                    
                    analysis = processor._parse_analysis_response(response)
                    
                    assert analysis.relevance_score == 0.5  # Default fallback
                    assert "Unable to parse" in analysis.summary
                    assert "Analysis parsing failed" in analysis.concerns
    
    def test_parse_analysis_response_with_extra_text(self, mock_openai_client):
        """Test parsing JSON response with extra text."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor()
                    
                    response = f"""
                    Here's my analysis:
                    
                    {json.dumps({
                        "relevance_score": 0.7,
                        "summary": "Good role",
                        "extracted_requirements": ["Java"],
                        "extracted_benefits": ["Benefits"],
                        "match_reasons": ["Skills match"],
                        "concerns": ["Location"],
                        "salary_estimate": None
                    })}
                    
                    Hope this helps!
                    """
                    
                    analysis = processor._parse_analysis_response(response)
                    
                    assert analysis.relevance_score == 0.7
                    assert analysis.summary == "Good role"
                    assert "Java" in analysis.extracted_requirements
    
    @pytest.mark.asyncio
    async def test_analyze_job_openai(self, mock_openai_client):
        """Test job analysis with OpenAI."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor(preferred_provider="openai")
                    
                    job_data = {
                        'title': 'Senior Python Developer',
                        'company': 'AI Startup',
                        'location': 'San Francisco',
                        'description': 'Build AI applications with Python'
                    }
                    
                    user_profile = {
                        'job_titles': ['Python Developer'],
                        'keywords': ['Python', 'AI'],
                        'remote_ok': False
                    }
                    
                    analysis = await processor.analyze_job(job_data, user_profile)
                    
                    assert isinstance(analysis, JobAnalysis)
                    assert analysis.relevance_score == 0.8
                    assert analysis.summary == "Excellent Python developer role"
                    assert "Python" in analysis.extracted_requirements
    
    @pytest.mark.asyncio
    async def test_analyze_job_anthropic(self, mock_anthropic_client):
        """Test job analysis with Anthropic."""
        with patch('ai.ai_client.ANTHROPIC_AVAILABLE', True):
            with patch('ai.ai_client.ANTHROPIC_API_KEY', 'test-key'):
                with patch('ai.ai_client.anthropic.Anthropic', return_value=mock_anthropic_client):
                    processor = AIJobProcessor(preferred_provider="anthropic")
                    
                    job_data = {
                        'title': 'Backend Developer',
                        'company': 'Web Company',
                        'location': 'Remote',
                        'description': 'Build web APIs'
                    }
                    
                    user_profile = {
                        'job_titles': ['Backend Developer'],
                        'keywords': ['Python', 'API'],
                        'remote_ok': True
                    }
                    
                    analysis = await processor.analyze_job(job_data, user_profile)
                    
                    assert isinstance(analysis, JobAnalysis)
                    assert analysis.relevance_score == 0.75
                    assert analysis.summary == "Good backend developer position"
                    assert "Python" in analysis.extracted_requirements
    
    @pytest.mark.asyncio
    async def test_analyze_job_api_failure(self, mock_openai_client):
        """Test job analysis with API failure."""
        # Mock API failure
        mock_openai_client.chat.completions.create.side_effect = Exception("API Error")
        
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor()
                    
                    job_data = {'title': 'Developer', 'company': 'Company'}
                    user_profile = {'job_titles': ['Developer']}
                    
                    analysis = await processor.analyze_job(job_data, user_profile)
                    
                    # Should return fallback analysis
                    assert analysis.relevance_score == 0.5
                    assert "Analysis unavailable" in analysis.summary
                    assert "AI analysis failed" in analysis.concerns
    
    @pytest.mark.asyncio
    async def test_batch_analyze_jobs(self, mock_openai_client):
        """Test batch job analysis."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor()
                    
                    jobs = [
                        {'title': 'Python Dev 1', 'company': 'Company 1'},
                        {'title': 'Python Dev 2', 'company': 'Company 2'},
                        {'title': 'Python Dev 3', 'company': 'Company 3'}
                    ]
                    
                    user_profile = {'job_titles': ['Python Developer']}
                    
                    analyses = await processor.batch_analyze_jobs(jobs, user_profile, max_concurrent=2)
                    
                    assert len(analyses) == 3
                    for analysis in analyses:
                        assert isinstance(analysis, JobAnalysis)
                        assert analysis.relevance_score == 0.8  # From mock response
    
    @pytest.mark.asyncio
    async def test_generate_job_summary(self, mock_openai_client):
        """Test job summary generation."""
        # Mock summary response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "This is a great Python developer role at a growing startup."
        mock_openai_client.chat.completions.create.return_value = mock_response
        
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor()
                    
                    job_data = {
                        'title': 'Python Developer',
                        'company': 'Startup Inc',
                        'description': 'Build amazing Python applications'
                    }
                    
                    summary = await processor.generate_job_summary(job_data)
                    
                    assert summary == "This is a great Python developer role at a growing startup."
    
    def test_get_provider_info(self, mock_openai_client):
        """Test getting provider information."""
        with patch('ai.ai_client.OPENAI_AVAILABLE', True):
            with patch('ai.ai_client.OPENAI_API_KEY', 'test-key'):
                with patch('ai.ai_client.openai.OpenAI', return_value=mock_openai_client):
                    processor = AIJobProcessor(preferred_provider="openai")
                    
                    info = processor.get_provider_info()
                    
                    assert info['active_provider'] == 'openai'
                    assert info['openai_available'] is True
                    assert info['preferred_provider'] == 'openai'

if __name__ == "__main__":
    pytest.main([__file__])