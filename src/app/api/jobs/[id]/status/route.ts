import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { JobPosting, ApiResponse } from '@/lib/types';
import { broadcastJobStatusChange } from '@/lib/realtime-server';


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses: JobPosting['status'][] = ['new', 'viewed', 'applied', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Validate job ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<JobPosting>('jobs');

    // Update job status
    const result = await collection.findOneAndUpdate(
      { _id: id },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Broadcast real-time update
    broadcastJobStatusChange({
      jobId: id,
      status
    });

    const response: ApiResponse<JobPosting> = {
      success: true,
      data: result,
      message: 'Job status updated successfully'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating job status:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update job status'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}