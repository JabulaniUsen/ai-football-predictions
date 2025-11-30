import { NextRequest, NextResponse } from 'next/server';
import { getAIAnalysis } from '@/lib/ai-analysis';
import { Match, H2HData, TeamStats } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      match,
      h2hData,
      homeStats,
      awayStats,
      homeForm,
      awayForm,
    }: {
      match: Match;
      h2hData: H2HData | null;
      homeStats: TeamStats | null;
      awayStats: TeamStats | null;
      homeForm: any;
      awayForm: any;
    } = body;

    const result = await getAIAnalysis(
      match,
      h2hData,
      homeStats,
      awayStats,
      homeForm,
      awayForm
    );

    if (!result) {
      // Check if API key is missing
      const apiKey = process.env.CEREBRAS_API_KEY || process.env.NEXT_PUBLIC_CEREBRAS_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { 
            error: 'Cerebras API key not configured. Please set CEREBRAS_API_KEY or NEXT_PUBLIC_CEREBRAS_API_KEY environment variable.',
            details: 'The AI analysis feature requires a Cerebras API key to function.'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to get AI analysis',
          details: 'The AI service may be unavailable or returned an invalid response. Check server logs for more details.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && error.message.includes('API key') 
      ? 'Please configure your Cerebras API key in environment variables.'
      : 'Check server logs for more details.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

