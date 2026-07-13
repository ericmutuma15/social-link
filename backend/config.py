import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Use DATABASE_URL when provided; fall back to a local sqlite file for development
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or f"sqlite:///{os.path.join(os.path.dirname(__file__), 'social_dev.db')}"