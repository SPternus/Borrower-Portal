import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';
    
    // Forward the entire request body (FormData) to Python API
    const body = await request.formData();
    
    const response = await fetch(`${PYTHON_API_URL}/api/documents/upload`, {
      method: 'POST',
      body: body,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Upload failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 