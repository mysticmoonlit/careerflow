#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install production Python dependencies
pip install -r requirements.txt

# Collect static files for WhiteNoise to serve
python manage.py collectstatic --no-input

# Run database migrations
python manage.py migrate
