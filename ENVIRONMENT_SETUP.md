# Environment Setup

## Overview
The Google Sheets URL is now stored securely in environment variables instead of being hardcoded in the script.

## Setup Instructions

### 1. Create Environment File
Copy the example environment file:
```bash
cp .env.example .env
```

### 2. Configure Your Google Sheets URL
Edit the `.env` file and replace `YOUR_SHEET_ID_HERE` with your actual Google Sheets ID:
```bash
GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_ACTUAL_SHEET_ID/edit?usp=sharing
```

### 3. Install Dependencies
Make sure you have the required dependencies installed:
```bash
pip install -r requirements.txt
```

### 4. Run the Script
Now you can run the script normally:
```bash
python update_books.py
```

## Security Benefits

- ✅ **Google Sheets URL is not exposed** in the source code
- ✅ **Environment file is ignored by git** - won't be committed accidentally
- ✅ **Easy to share code** without exposing sensitive URLs
- ✅ **Different environments** can use different sheets (dev, prod, etc.)

## File Structure

- `.env` - Your actual environment variables (ignored by git)
- `.env.example` - Template file showing what variables are needed (tracked by git)
- `.gitignore` - Ensures `.env` is never committed to git

## Troubleshooting

If you get an error like "GOOGLE_SHEET_URL environment variable not set!", make sure:

1. You created the `.env` file
2. The file contains the correct variable name and URL
3. The URL is properly formatted
4. The `python-dotenv` package is installed 