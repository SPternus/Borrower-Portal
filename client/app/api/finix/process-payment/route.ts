import { NextRequest, NextResponse } from 'next/server';

interface FinixPaymentRequest {
  opportunityId: string;
  amount: number; // Amount in cents
  currency: string;
  card: {
    number: string;
    exp_month: string;
    exp_year: string;
    security_code: string;
    name: string;
  };
  billing_address: {
    line1: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  description: string;
  metadata: {
    opportunity_id: string;
    user_email: string;
    payment_type: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const paymentData: FinixPaymentRequest = await request.json();
    
    // Validate required fields
    if (!paymentData.opportunityId || !paymentData.amount || !paymentData.card) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment data' },
        { status: 400 }
      );
    }

    // Forward the payment request to the Python backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/finix/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Payment processing failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 