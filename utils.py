# utils.py

import os

def get_openai_api_key():
    """
    Returns the OpenAI API key from environment variables.
    Make sure you set the OPENAI_API_KEY before running your script.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set.")
    return api_key

def get_openai_api_key():
    return "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"



