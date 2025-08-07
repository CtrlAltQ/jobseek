import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { UserSettings, ApiResponse } from '@/lib/types';
import { broadcastSettingsUpdate } from '@/lib/realtime-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();
    const collection = db.collection<UserSettings>('settings');
    
    // For now, we'll use a single settings document
    // In a multi-user system, this would be user-specific
    const settings = await collection.findOne({});
    
    const response: ApiResponse<UserSettings | null> = {
      success: true,
      data: settings
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching settings:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch settings'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDatabase();
    const collection = db.collection<UserSettings>('settings');
    
    const updatedSettings: Partial<UserSettings> = {
      ...body,
      updatedAt: new Date()
    };
    
    const result = await collection.findOneAndUpdate(
      {}, // For single user, update the first/only document
      { $set: updatedSettings },
      { upsert: true, returnDocument: 'after' }
    );

    // Broadcast real-time update
    broadcastSettingsUpdate();
    
    const response: ApiResponse<UserSettings> = {
      success: true,
      data: result as UserSettings,
      message: 'Settings updated successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update settings'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}