import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ApiResponse } from '@/lib/types';

interface ContactSubmission {
  _id?: string;
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
  submittedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: name, email, subject, and message are required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid email format'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate message length
    if (message.length > 5000) {
      const response: ApiResponse = {
        success: false,
        error: 'Message too long. Maximum 5000 characters allowed'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get client information for basic tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const db = await getDatabase();
    const collection = db.collection<ContactSubmission>('contact_submissions');

    const submission: ContactSubmission = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company?.trim(),
      subject: subject.trim(),
      message: message.trim(),
      submittedAt: new Date(),
      ipAddress,
      userAgent
    };

    const result = await collection.insertOne(submission);

    // In a real application, you might want to:
    // 1. Send an email notification
    // 2. Add to a CRM system
    // 3. Send an auto-reply to the sender
    
    const response: ApiResponse<{ submissionId: string }> = {
      success: true,
      data: {
        submissionId: result.insertedId.toString()
      },
      message: 'Thank you for your message! I will get back to you soon.'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing contact form:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to submit contact form. Please try again later.'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Optional: GET endpoint to retrieve contact submissions (for admin use)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await getDatabase();
    const collection = db.collection<ContactSubmission>('contact_submissions');

    const submissions = await collection
      .find({})
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments({});

    const response: ApiResponse<{
      submissions: ContactSubmission[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch contact submissions'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}