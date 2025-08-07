"""
Utility modules for job scraping and data processing.
"""

from .data_utils import JobDataProcessor, SalaryInfo
from .duplicate_detector import DuplicateDetector, DuplicateMatch

__all__ = [
    'JobDataProcessor',
    'SalaryInfo', 
    'DuplicateDetector',
    'DuplicateMatch'
]