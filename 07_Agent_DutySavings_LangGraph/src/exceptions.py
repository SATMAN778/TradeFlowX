"""
src/exceptions.py — Custom exception classes for the Duty Savings Analysis Agent.
"""

class DutySavingsAgentException(Exception):
    """Base exception for all errors in the Duty Savings Agent."""
    pass


class ConfigurationError(DutySavingsAgentException):
    """Raised when a required asset or environment variable is missing."""
    pass


class DocumentParsingError(DutySavingsAgentException):
    """Raised when document parsing fails or actual duty data cannot be extracted."""
    pass


class DataServiceError(DutySavingsAgentException):
    """Raised when a Data Service operation fails."""
    pass
