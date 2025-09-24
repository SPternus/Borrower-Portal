import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth0_user_id = searchParams.get('auth0_user_id');
    const contact_id = searchParams.get('contact_id');
    
    if (!auth0_user_id) {
      return NextResponse.json(
        { error: 'auth0_user_id is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    let pythonUrl = `${PYTHON_API_URL}/api/applications/save?auth0_user_id=${encodeURIComponent(auth0_user_id)}`;
    if (contact_id) {
      pythonUrl += `&contact_id=${encodeURIComponent(contact_id)}`;
    }

    const response = await fetch(pythonUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error saving application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 