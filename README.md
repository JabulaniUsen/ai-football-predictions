This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory with the following environment variables:

```bash
# Required: API Football API key for fetching match data
NEXT_PUBLIC_API_FOOTBALL_KEY=your_api_football_key_here

# Optional: Google Gemini API key for AI-enhanced predictions
# Get your API key from: https://aistudio.google.com/app/apikey
NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Required: Supabase configuration for storing predictions
NEXT_PUBLIC_SUPABASE_URL=https://cmjefszkbalkfdxnbkui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtamVmc3prYmFsa2ZkeG5ia3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTM0MzgsImV4cCI6MjA3OTk4OTQzOH0.EkmlVwy-FpJfzxGcCOXm9ZLzA1aV7-5VtF-J0J1R3oY
```

### Database Setup

1. Run the Supabase migration to create the necessary tables:
   ```bash
   # Using Supabase CLI (if installed)
   supabase db push
   
   # Or manually run the SQL migration file:
   # supabase/migrations/001_create_predictions_table.sql
   ```

2. The migration creates two tables:
   - `matches`: Stores match information
   - `predictions`: Stores AI-generated predictions with all statistics

3. Predictions are automatically saved to the database when generated.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
