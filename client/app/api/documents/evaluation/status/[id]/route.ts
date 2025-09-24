import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileFolderId } = await params;
    
    if (!fileFolderId) {
      return NextResponse.json(
        { error: 'File folder ID is required' },
        { status: 400 }
      );
    }

    // Forward the request to the Python backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(
      `${backendUrl}/api/documents/evaluation/status/${fileFolderId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

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
    console.error('Error checking evaluation status:', error);
    return NextResponse.json(
      { error: 'Failed to check evaluation status' },
      { status: 500 }
    );
  }
}


