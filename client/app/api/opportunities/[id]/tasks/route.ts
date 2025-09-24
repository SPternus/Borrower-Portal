import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const response = await fetch(`${PYTHON_API_URL}/api/opportunities/${id}/tasks`);
    
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Failed to parse JSON response from backend:', error);
      return NextResponse.json(
        { error: 'Invalid response from backend server' },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying GET tasks request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const response = await fetch(`${PYTHON_API_URL}/api/opportunities/${id}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Failed to parse JSON response from backend:', error);
      return NextResponse.json(
        { error: 'Invalid response from backend server' },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying POST task request:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

