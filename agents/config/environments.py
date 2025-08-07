import os
from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class EnvironmentConfig:
    name: str
    api_base_url: str
    mongodb_uri: str
    log_level: str
    enable_sentry: bool
    schedule_frequency: str
    max_concurrent_scrapers: int
    request_delay: float
    retry_attempts: int

class EnvironmentManager:
    def __init__(self):
        self.env = os.getenv('ENVIRONMENT', 'development')
        self.config = self._load_config()
    
    def _load_config(self) -> EnvironmentConfig:
        configs = {
            'development': EnvironmentConfig(
                name='development',
                api_base_url='http://localhost:3000',
                mongodb_uri=os.getenv('MONGODB_URI', 'mongodb://localhost:27017/ai-job-finder-dev'),
                log_level='DEBUG',
                enable_sentry=False,
                schedule_frequency='manual',
                max_concurrent_scrapers=2,
                request_delay=2.0,
                retry_attempts=2
            ),
            'staging': EnvironmentConfig(
                name='staging',
                api_base_url=os.getenv('API_BASE_URL', 'https://ai-job-finder-staging.vercel.app'),
                mongodb_uri=os.getenv('MONGODB_URI'),
                log_level='INFO',
                enable_sentry=True,
                schedule_frequency='0 */6 * * *',
                max_concurrent_scrapers=3,
                request_delay=3.0,
                retry_attempts=3
            ),
            'production': EnvironmentConfig(
                name='production',
                api_base_url=os.getenv('API_BASE_URL', 'https://ai-job-finder.vercel.app'),
                mongodb_uri=os.getenv('MONGODB_URI'),
                log_level='INFO',
                enable_sentry=True,
                schedule_frequency='0 */4 * * *',
                max_concurrent_scrapers=4,
                request_delay=4.0,
                retry_attempts=3
            )
        }
        
        config = configs.get(self.env)
        if not config:
            raise ValueError(f"Unknown environment: {self.env}")
        
        # Validate required environment variables
        if config.mongodb_uri is None:
            raise ValueError("MONGODB_URI environment variable is required")
        
        return config
    
    def get_config(self) -> EnvironmentConfig:
        return self.config
    
    def is_production(self) -> bool:
        return self.env == 'production'
    
    def is_development(self) -> bool:
        return self.env == 'development'
    
    def is_staging(self) -> bool:
        return self.env == 'staging'

# Global instance
env_manager = EnvironmentManager()