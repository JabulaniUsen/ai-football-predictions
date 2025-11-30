# Supabase Database Setup Guide

## Running the Migration

You have two options to run the database migration:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/001_create_predictions_table.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref cmjefszkbalkfdxnbkui

# Push migrations
supabase db push
```

## Database Schema

The migration creates two main tables:

### `matches` Table
Stores match information including:
- Match details (teams, date, time, league, country)
- Stadium and referee information
- Team badges

### `predictions` Table
Stores AI-generated predictions including:
- Winner probabilities (home, draw, away)
- Predicted scores
- Both teams to score probabilities
- Over/Under 2.5 probabilities
- Confidence scores
- Head-to-head statistics

## Features Enabled

After running the migration:

1. **Automatic Saving**: All predictions are automatically saved to the database when generated
2. **Historical View**: Users can switch to "Historical Predictions" mode to view past predictions
3. **Date Range Filtering**: Historical predictions can be filtered by date range, league, and country
4. **Performance Tracking**: Track prediction accuracy over time by comparing historical predictions with actual results

## Environment Variables

Make sure your `.env.local` file includes:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cmjefszkbalkfdxnbkui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtamVmc3prYmFsa2ZkeG5ia3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTM0MzgsImV4cCI6MjA3OTk4OTQzOH0.EkmlVwy-FpJfzxGcCOXm9ZLzA1aV7-5VtF-J0J1R3oY
```

## Security

The migration includes Row Level Security (RLS) policies that allow all operations. You may want to restrict this based on your security requirements:

- For production, consider adding authentication-based policies
- Limit read access to authenticated users if needed
- Add write restrictions based on user roles

## Troubleshooting

If you encounter issues:

1. **Migration fails**: Check that you have the correct permissions in Supabase
2. **Tables not created**: Verify the SQL was executed successfully in the SQL Editor
3. **Connection errors**: Double-check your environment variables are set correctly
4. **RLS blocking queries**: Check the Row Level Security policies in the Supabase dashboard

