import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: opportunityId } = await context.params;
    const { searchParams } = new URL(request.url);
    const loanType = searchParams.get('loan_type');
    
    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (loanType) {
      queryParams.append('loan_type', loanType);
    }
    
    const url = `${PYTHON_API_URL}/api/folders/opportunities/${opportunityId}/folders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to get folder hierarchy' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Folder hierarchy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: opportunityId } = await context.params;
    const body = await request.json();
    const { loan_type } = body;
    
    if (!loan_type) {
      return NextResponse.json(
        { error: 'loan_type is required' },
        { status: 400 }
      );
    }
    
    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';
    
    const response = await fetch(`${PYTHON_API_URL}/api/folders/opportunities/${opportunityId}/folders/create-structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ loan_type }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to create folder structure' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Folder creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

