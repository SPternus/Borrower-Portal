import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const auth0_user_id = searchParams.get('auth0_user_id');
    const invitation_token = searchParams.get('invitation_token');

    if (!auth0_user_id) {
      return NextResponse.json(
        { error: 'auth0_user_id is required' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();

    // Build backend URL
    const backendUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/plaid/exchange-public-token`);
    backendUrl.searchParams.append('auth0_user_id', auth0_user_id);
    if (invitation_token) {
      backendUrl.searchParams.append('invitation_token', invitation_token);
    }

    console.log('🔄 Proxying Plaid public token exchange to:', backendUrl.toString());

    // Forward request to Python backend
    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Backend error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ Plaid public token exchange successful');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in Plaid public token exchange proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



