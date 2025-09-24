import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const response = await fetch(`${PYTHON_API_URL}/api/tasks/${id}/status`, {
      method: 'PUT',
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
    console.error('Error proxying PUT task status request:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}

