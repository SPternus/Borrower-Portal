import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const invitationToken = searchParams.get('invitation_token');
    
    // For demo purposes, skip auth requirement if no header provided
    // Forward the request to the backend server
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Build the URL with query parameters
    const apiUrl = new URL('/api/salesforce/opportunities', backendUrl);
    if (contactId) {
      apiUrl.searchParams.set('contactId', contactId);
    }
    if (invitationToken) {
      apiUrl.searchParams.set('invitation_token', invitationToken);
    }
    
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers,
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const auth0UserId = searchParams.get('auth0_user_id');
    const invitationToken = searchParams.get('invitation_token');
    
    // Get the request body
    const body = await request.json();
    
    // Forward the request to the backend server
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Build the URL with query parameters
    const apiUrl = new URL('/api/salesforce/opportunities', backendUrl);
    if (auth0UserId) {
      apiUrl.searchParams.set('auth0_user_id', auth0UserId);
    }
    if (invitationToken) {
      apiUrl.searchParams.set('invitation_token', invitationToken);
    }
    
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Failed to create opportunity:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json(
      { error: 'Failed to create opportunity' },
      { status: 500 }
    );
  }
} 