import { NextRequest, NextResponse } from 'next/server';

interface Params {
  id: string;
  documentId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id: opportunityId, documentId } = await params;

    // Forward the request to the Python backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/documents/opportunity/${opportunityId}/download/${documentId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Document not found',
          detail: errorData.detail || 'Failed to retrieve document'
        },
        { status: response.status }
      );
    }

    // Get the content type and other headers from the backend response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');
    const contentLength = response.headers.get('content-length');

    // Create response headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    
    if (contentDisposition) {
      responseHeaders.set('Content-Disposition', contentDisposition);
    }
    
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    // Allow cross-origin requests for preview functionality
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    // Stream the response body
    const body = response.body;

    return new NextResponse(body, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Error proxying document download:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 