"""
Setup configuration for Advocacy Platform
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README for long description
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text(encoding='utf-8') if readme_file.exists() else ""

# Read requirements
requirements_file = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_file.exists():
    with open(requirements_file, 'r', encoding='utf-8') as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="advocacy-platform",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Advocacy Platform - Data Analysis & ETL Pipeline",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/advocacy-platform",
    packages=find_packages(exclude=['tests', 'tests.*', 'docs', 'tools']),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
    ],
    python_requires=">=3.10",
    install_requires=requirements,
    extras_require={
        'dev': [
            'pytest>=7.0.0',
            'pytest-cov>=4.0.0',
            'black>=23.0.0',
            'flake8>=6.0.0',
            'mypy>=1.0.0',
        ],
        'pdf': [
            'reportlab>=4.0.0',
        ],
    },
    entry_points={
        'console_scripts': [
            'advocacy-etl=backend.etl.pipeline:main',
            'advocacy-api=backend.api.main:app',
        ],
    },
    include_package_data=True,
    package_data={
        'backend': ['py.typed'],
    },
    zip_safe=False,
)

