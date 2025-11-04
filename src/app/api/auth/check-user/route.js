import { NextResponse } from 'next/server';
import { User } from '@/src/models/user';
import dbConnect from '@/src/lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Case-insensitive email lookup
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!user) {
      return NextResponse.json(
        {
          exists: false,
          hasPassword: false,
          authMethod: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        exists: true,
        hasPassword: !!user.password,
        authMethod: user.authMethod || 'credentials',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check user error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
