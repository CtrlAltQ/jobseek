# AI Job Finder - Job Scraping Agents

This directory contains the Python-based job scraping agents for the AI Job Finder project. The agents are responsible for automatically discovering and extracting job postings from various sources.

## 🚀 Features Completed

### ✅ Task 9: Build job source scraping modules

### ✅ Task 10: Integrate AI processing pipeline

We have successfully implemented a comprehensive job scraping system with the following components:

#### Core Scrapers
- **Indeed Scraper** (`indeed_scraper.py`) - Scrapes jobs from Indeed.com with pagination support
- **LinkedIn Scraper** (`linkedin_scraper.py`) - Scrapes LinkedIn Jobs with authentication handling
- **RemoteOK Scraper** (`remote_ok_scraper.py`) - Scrapes remote jobs from RemoteOK.io
- **WeWorkRemotely Scraper** (`weworkremotely_scraper.py`) - Scrapes remote jobs from WeWorkRemotely.com
- **Company Scraper** (`company_scraper.py`) - Generic scraper for company career pages with configurable selectors

#### AI Processing Pipeline
- **AI Client** (`ai/ai_client.py`) - OpenAI and Anthropic API integration for job analysis
- **Job Processor** (`ai/job_processor.py`) - Complete AI-enhanced job processing pipeline
- **Enhanced Job Data** - Extended job data model with AI analysis results

#### Infrastructure
- **Base Scraper** (`base_scraper.py`) - Abstract base class with common functionality
- **Scraper Orchestrator** (`scraper_orchestrator.py`) - Coordinates multiple scrapers with error handling and retry logic
- **Duplicate Detection** (`utils/duplicate_detector.py`) - Removes duplicate job postings
- **Data Processing** (`utils/data_utils.py`) - Utilities for cleaning and validating job data

## 🏗️ Architecture

### Base Scraper Framework
All scrapers inherit from `BaseJobScraper` which provides:
- Async context management for browser lifecycle
- Playwright-based web scraping with stealth features
- Rate limiting and retry logic
- Duplicate detection
- Error handling and logging
- Execution statistics

### Job Data Model
Standardized `JobData` structure includes:
- Title, company, location, description
- Requirements and benefits
- Job type (full-time, part-time, contract, internship)
- Remote work indicator
- Source information and URLs
- Posted and discovered dates
- Salary information (when available)

### Orchestrator Features
- **Concurrent Scraping**: Runs multiple scrapers simultaneously
- **Error Recovery**: Retry logic with exponential backoff
- **Duplicate Removal**: Intelligent deduplication across sources
- **Analytics**: Job statistics and source performance metrics
- **Configurable**: Enable/disable sources and set custom parameters

### AI Processing Features
- **Job Relevance Scoring**: AI-powered relevance scoring (0.0-1.0) based on user profile
- **Requirement Extraction**: Automatic extraction of technical requirements from job descriptions
- **Benefit Identification**: AI identification and categorization of job benefits
- **Salary Estimation**: Market-based salary estimation for jobs without posted salaries
- **Match Analysis**: Detailed explanations of why jobs match or don't match user preferences
- **Batch Processing**: Concurrent AI analysis of multiple jobs with rate limiting
- **Provider Flexibility**: Support for both OpenAI and Anthropic AI providers
- **Fallback Handling**: Graceful degradation when AI services are unavailable

## 🧪 Testing

Comprehensive test suite with **160+ passing tests** covering:
- Unit tests for all scraper classes
- Integration tests for the orchestrator
- AI processing pipeline tests
- Mock-based testing for external dependencies
- Error handling and edge cases
- Data validation and processing

### Running Tests
```bash
# Activate virtual environment
source venv/bin/activate

# Run all tests
python -m pytest tests/ -v

# Run specific scraper tests
python -m pytest tests/test_indeed_scraper.py -v

# Run AI processing tests
python -m pytest tests/test_ai_client.py tests/test_job_processor.py -v
```

## 🔧 Configuration

### Environment Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install

# Set up AI API keys (choose one or both)
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Scraper Configuration
```python
config = {
    'sources': {
        'indeed': {'enabled': True},
        'linkedin': {'enabled': True},
        'remote_ok': {'enabled': True},
        'weworkremotely': {'enabled': True}
    },
    'companies': [
        {
            'name': 'Google',
            'careers_url': 'https://careers.google.com/jobs/results/',
            'enabled': True,
            'selectors': {
                'job_container': ['.gc-card'],
                'title': ['.gc-card__title'],
                'location': ['.gc-card__location']
            }
        }
    ],
    'max_retries': 2,
    'retry_delay': 5
}
```

## 🚀 Usage Examples

### Basic Scraping
```python
from scrapers.scraper_orchestrator import ScraperOrchestrator

# Search parameters
search_params = {
    'job_titles': ['Software Engineer', 'Python Developer'],
    'keywords': ['Python', 'Django', 'FastAPI'],
    'locations': ['Remote', 'San Francisco'],
    'remote_ok': True,
    'job_type': 'full-time',
    'days_back': 7,
    'max_pages': 2
}

# Initialize and run orchestrator
orchestrator = ScraperOrchestrator(config)
results = await orchestrator.scrape_all_sources(search_params)

# Access results
print(f"Found {len(results['jobs'])} unique jobs")
print(f"Top companies: {orchestrator.get_top_companies(5)}")
print(f"Remote jobs: {orchestrator.get_remote_jobs_percentage():.1f}%")
```

### AI-Enhanced Job Processing
```python
from examples.ai_integration_example import IntelligentJobFinder

# User profile for AI analysis
user_profile = {
    'job_titles': ['Python Developer', 'Backend Developer'],
    'keywords': ['Python', 'Django', 'PostgreSQL', 'API'],
    'locations': ['Remote', 'San Francisco'],
    'remote_ok': True,
    'salary_range': {'min': 80000, 'max': 130000},
    'experience_level': 'mid-level'
}

# Initialize intelligent job finder
job_finder = IntelligentJobFinder(ai_provider="openai")

# Run complete workflow with AI enhancement
results = await job_finder.find_and_analyze_jobs(search_params, user_profile)

# Access AI-enhanced results
enhanced_jobs = results['enhanced_jobs']
recommendations = results['recommendations']
ai_analysis = results['ai_analysis']

print(f"Enhanced {len(enhanced_jobs)} jobs with AI analysis")
print(f"Average relevance score: {results['summary']['average_relevance_score']:.2f}")
print(f"High-relevance jobs: {results['summary']['high_relevance_jobs']}")
```

## 📊 Key Features

### Error Handling & Retry Logic
- Automatic retry with exponential backoff
- Graceful handling of bot detection
- Comprehensive error logging
- Partial success handling

### Anti-Detection Measures
- Random user agents
- Request rate limiting
- Browser stealth settings
- Cookie and popup handling

### Data Quality
- Input validation and sanitization
- Salary parsing and normalization
- Job type standardization
- Remote work detection
- Duplicate removal across sources

### Performance
- Concurrent scraping across sources
- Efficient duplicate detection
- Resource cleanup and memory management
- Configurable rate limiting

## 📈 Results

The complete job discovery and AI processing system successfully:

### Scraping Infrastructure ✅
- ✅ Implements 5 different job source scrapers (Indeed, LinkedIn, RemoteOK, WeWorkRemotely, Company pages)
- ✅ Provides comprehensive error handling and retry logic
- ✅ Includes intelligent duplicate detection
- ✅ Offers configurable company career page scraping
- ✅ Supports concurrent execution with proper resource management

### AI Processing Pipeline ✅
- ✅ Integrates OpenAI and Anthropic APIs for job analysis
- ✅ Provides intelligent job relevance scoring (0.0-1.0)
- ✅ Extracts requirements and benefits from job descriptions
- ✅ Generates salary estimates for jobs without posted salaries
- ✅ Creates personalized job recommendations
- ✅ Handles batch processing with concurrent AI analysis
- ✅ Includes comprehensive fallback mechanisms for AI failures

### Quality & Testing ✅
- ✅ Maintains comprehensive test coverage with 160+ passing tests
- ✅ Provides detailed analytics and reporting
- ✅ Includes integration examples and documentation
- ✅ Supports both development and production configurations

## 🔄 Next Steps

The job scraping infrastructure is now complete and ready for integration with:
1. The AI processing pipeline for job relevance scoring
2. The Node.js API for data submission
3. The scheduling system for automated execution
4. The frontend dashboard for displaying results

This robust foundation provides the core functionality needed for automated job discovery across multiple sources while maintaining high data quality and system reliability.