import { NextResponse } from 'next/server';
import { User } from '@/src/models/user';
import dbConnect from '@/src/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, age } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
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

    // Case-insensitive email lookup
    const existingUser = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUser) {
      // User exists - check if they have a password
      if (existingUser.password) {
        // User already has a password - they should login instead
        return NextResponse.json(
          { message: 'User already exists. Please login instead.' },
          { status: 400 }
        );
      } else {
        // User exists but has no password (social login user) - set password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await User.findByIdAndUpdate(existingUser._id, {
          password: hashedPassword,
          authMethod: 'mixed', // User now has both social login and password
        });

        return NextResponse.json(
          { 
            message: 'Password set successfully. You can now login with email and password.',
            user: {
              id: existingUser._id.toString(),
              email: existingUser.email,
              name: existingUser.name,
            }
          },
          { status: 200 }
        );
      }
    }

    // New user - create account
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      authMethod: 'credentials',
      age: age || 25,
      freeCredits: 10,
      usedCredits: 0,
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000 || error.message.includes('duplicate')) {
      return NextResponse.json(
        { message: 'User with this email already exists. Please login instead.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}


