import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]/route';
import { User } from '@/src/models/user';
import dbConnect from '@/src/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { password, currentPassword } = body;

    if (!password) {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // If user already has a password, require current password
    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json(
          { message: 'Current password is required to change password' },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { message: 'Current password is incorrect' },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and authMethod
    const updateData = {
      password: hashedPassword,
    };

    // If user was social login only, change authMethod to 'mixed'
    if (user.authMethod && (user.authMethod === 'google' || user.authMethod === 'facebook')) {
      updateData.authMethod = 'mixed';
    } else if (!user.authMethod) {
      // If no authMethod set, set it to 'credentials' or 'mixed' based on whether they had a password
      updateData.authMethod = user.password ? 'credentials' : 'mixed';
    }

    await User.findByIdAndUpdate(user._id, updateData);

    return NextResponse.json(
      {
        message: user.password 
          ? 'Password updated successfully' 
          : 'Password set successfully. You can now login with email and password.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}


