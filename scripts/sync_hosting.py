"""Copy the canonical app into Firebase's existing public directory.

Run from any directory: python3 scripts/sync_hosting.py
Existing JSON backups are never read, modified, or copied by this script.
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'yes'
PUBLIC.mkdir(exist_ok=True)
shutil.copy2(ROOT / 'index.html', PUBLIC / 'index.html')
shutil.copytree(ROOT / 'assets', PUBLIC / 'assets', dirs_exist_ok=True)
print('Hosting files synchronized from index.html and assets/.')
