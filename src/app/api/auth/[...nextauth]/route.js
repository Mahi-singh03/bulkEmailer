import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import { User } from '@/src/models/user';
import dbConnect from '@/src/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('=== AUTHENTICATION ATTEMPT ===');
        console.log('Email provided:', credentials?.email);
        console.log('Password provided:', credentials?.password ? 'Yes' : 'No');
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          console.log('Connecting to database...');
          await dbConnect();
          
          // Case-insensitive email lookup
          console.log('Looking up user with email:', credentials.email);
          const user = await User.findOne({ 
            email: { $regex: new RegExp(`^${credentials.email}$`, 'i') }
          });

          if (!user) {
            console.log('❌ User not found in database:', credentials.email);
            return null;
          }

          console.log('✓ User found:', user.email);
          console.log('User has password:', user.password ? 'Yes' : 'No');
          console.log('User authMethod:', user.authMethod || 'not set');

          // Check if user can authenticate with credentials
          // Users must have authMethod 'credentials' or 'mixed', and must have a password
          if (!user.password) {
            console.log('❌ User has no password (created with social login):', credentials.email);
            console.log('💡 User needs to set a password first. They can do this from their account settings.');
            return null;
          }

          // Only allow credentials login for users with 'credentials' or 'mixed' authMethod
          if (user.authMethod && user.authMethod !== 'credentials' && user.authMethod !== 'mixed') {
            console.log('❌ User cannot login with credentials (authMethod:', user.authMethod, '):', credentials.email);
            console.log('💡 User needs to login with their social account or set a password first.');
            return null;
          }

          console.log('Comparing passwords...');
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', credentials.email);
            return null;
          }

          console.log('✅ User authenticated successfully:', credentials.email);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('❌ Authorization error:', error);
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await dbConnect();

        // Skip user creation for credentials provider (already exists)
        if (account?.provider === 'credentials') {
          return true;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          // Determine authMethod based on provider
          const authMethod = account?.provider === 'google' ? 'google' : 
                           account?.provider === 'facebook' ? 'facebook' : 
                           'credentials';
          
          // Create new user with 10 free credits for social login
          await User.create({
            name: user.name,
            email: user.email,
            authMethod: authMethod, // Set authMethod based on provider
            age: 25, // You might want to get this from additional form
            freeCredits: 10,
            usedCredits: 0,
          });
        } else {
          // Update authMethod if user exists but doesn't have it set
          // This helps migrate existing users
          if (!existingUser.authMethod && account?.provider) {
            const authMethod = account.provider === 'google' ? 'google' : 
                             account.provider === 'facebook' ? 'facebook' : 
                             'credentials';
            
            // Only update if user doesn't have a password (social login user)
            // If user has password and was created via social, it should be 'mixed'
            if (!existingUser.password) {
              await User.findByIdAndUpdate(existingUser._id, {
                authMethod: authMethod,
              });
            }
          }
        }

        return true;
      } catch (error) {
        console.error('SignIn error:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Use token data for credentials provider (JWT strategy)
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        
        // Fetch user data from database to get credits
        try {
          await dbConnect();
          const user = await User.findOne({ email: token.email });
          
          if (user) {
            session.user.id = user._id.toString();
            session.user.freeCredits = user.freeCredits;
            session.user.usedCredits = user.usedCredits;
          }
        } catch (error) {
          console.error('Error fetching user in session:', error);
        }
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };