import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const invitationToken = searchParams.get('invitation_token');
    const body = await request.json();
    
    if (!authHeader && !invitationToken) {
      return NextResponse.json(
        { error: 'Authorization header or invitation token required' },
        { status: 401 }
      );
    }

    const { contactId, activityType, description, timestamp } = body;
    
    if (!contactId || !activityType || !description) {
      return NextResponse.json(
        { error: 'Contact ID, activity type, and description are required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend server
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Build the URL with query parameters
    const apiUrl = new URL('/api/salesforce/activity', backendUrl);
    if (invitationToken) {
      apiUrl.searchParams.set('invitation_token', invitationToken);
    }
    
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contactId,
        activityType,
        description,
        timestamp
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
} 