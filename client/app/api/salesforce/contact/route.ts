import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
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
    const apiUrl = new URL('/api/salesforce/contact', backendUrl);
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
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact information' },
      { status: 500 }
    );
  }
} 