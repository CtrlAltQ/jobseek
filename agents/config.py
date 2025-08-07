import os
from dotenv import load_dotenv

load_dotenv()

# API Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
NODEJS_API_URL = os.getenv('NODEJS_API_URL', 'http://localhost:3000/api')
AGENT_API_KEY = os.getenv('AGENT_API_KEY')

# Scraping Configuration
USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

# Rate limiting
REQUEST_DELAY = 2  # seconds between requests
MAX_RETRIES = 3

# Job sources configuration
JOB_SOURCES = {
    'indeed': {
        'base_url': 'https://www.indeed.com',
        'enabled': True,
        'rate_limit': 1  # requests per second
    },
    'linkedin': {
        'base_url': 'https://www.linkedin.com',
        'enabled': True,
        'rate_limit': 0.5
    },
    'remote_ok': {
        'base_url': 'https://remoteok.io',
        'enabled': True,
        'rate_limit': 1
    }
}