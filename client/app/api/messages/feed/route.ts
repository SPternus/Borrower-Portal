import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contact_id = searchParams.get('contact_id');
    const limit = searchParams.get('limit') || '20';
    const force_refresh = searchParams.get('force_refresh') || 'false';
    
    if (!contact_id) {
      return NextResponse.json(
        { error: 'contact_id is required' },
        { status: 400 }
      );
    }

    const pythonUrl = `${PYTHON_API_URL}/api/messages/feed?contact_id=${encodeURIComponent(contact_id)}&limit=${encodeURIComponent(limit)}&force_refresh=${encodeURIComponent(force_refresh)}`;

    const response = await fetch(pythonUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying feed request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 