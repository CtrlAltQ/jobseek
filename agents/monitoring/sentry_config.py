import os
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from config.environments import env_manager

def initialize_sentry():
    """Initialize Sentry for error tracking and performance monitoring."""
    config = env_manager.get_config()
    
    if not config.enable_sentry or not os.getenv('SENTRY_DSN'):
        return
    
    sentry_logging = LoggingIntegration(
        level=getattr(sentry_sdk.integrations.logging, config.log_level),
        event_level=sentry_sdk.integrations.logging.ERROR
    )
    
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN'),
        environment=config.name,
        traces_sample_rate=0.1 if config.name == 'production' else 1.0,
        integrations=[sentry_logging],
        before_send=_filter_events,
        release=os.getenv('RENDER_GIT_COMMIT', 'unknown'),
    )

def _filter_events(event, hint):
    """Filter out events we don't want to track."""
    if 'exc_info' in hint:
        exc_type, exc_value, tb = hint['exc_info']
        
        # Don't track expected scraping errors
        if 'TimeoutException' in str(exc_type) or 'NoSuchElementException' in str(exc_type):
            return None
        
        # Don't track connection errors during development
        if env_manager.is_development() and 'ConnectionError' in str(exc_type):
            return None
    
    return event

def capture_agent_error(error: Exception, context: dict = None):
    """Capture agent-specific errors with context."""
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("component", "agent")
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_exception(error)

def capture_scraper_error(error: Exception, scraper_name: str, job_source: str):
    """Capture scraper-specific errors."""
    with sentry_sdk.configure_scope() as scope:
        scope.set_tag("component", "scraper")
        scope.set_tag("scraper", scraper_name)
        scope.set_tag("source", job_source)
        sentry_sdk.capture_exception(error)

def add_breadcrumb(message: str, category: str = "agent", data: dict = None):
    """Add breadcrumb for debugging."""
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        data=data or {},
        level='info'
    )