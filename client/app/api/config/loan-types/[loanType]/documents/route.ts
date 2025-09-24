import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ loanType: string }> }
) {
  try {
    const { loanType } = await context.params;
    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';
    
    const response = await fetch(`${PYTHON_API_URL}/api/config/loan-types/${loanType}/documents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch loan type documents' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get loan type documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 