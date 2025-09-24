import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, contactId, accountId, loanOfficerId } = body;

    if (!email || !contactId || !accountId) {
      return NextResponse.json(
        { error: 'Email, contactId, and accountId are required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend server
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/auth/generate-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        contactId,
        accountId,
        loanOfficerId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Invitation generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invitation' },
      { status: 500 }
    );
  }
} 