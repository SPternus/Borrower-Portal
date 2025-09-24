import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const auth0_user_id = searchParams.get('auth0_user_id');
    const { id } = context.params;
    
    if (!auth0_user_id) {
      return NextResponse.json(
        { error: 'Auth0 user ID is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(
      `${backendUrl}/api/applications/${id}?auth0_user_id=${auth0_user_id}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to fetch application:', error);
      return NextResponse.json(
        { error: 'Failed to fetch application' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const auth0_user_id = searchParams.get('auth0_user_id');
    const { id } = context.params;
    
    if (!auth0_user_id) {
      return NextResponse.json(
        { error: 'Auth0 user ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(
      `${backendUrl}/api/applications/${id}?auth0_user_id=${auth0_user_id}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to save application:', error);
      return NextResponse.json(
        { error: 'Failed to save application' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error saving application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 