import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { User, EmailCampaign } from '@/src/models/user';
import { sendBulkEmails } from '@/src/lib/emailService';
import dbConnect from '@/src/lib/db';
import * as XLSX from 'xlsx';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { fileData, subject, message, campaignName } = body;

    if (!fileData || !subject || !message) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Parse Excel file
    const workbook = XLSX.read(fileData, { type: 'base64' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const emailData = XLSX.utils.sheet_to_json(worksheet);

    // Extract emails from Excel
    const emailList = emailData.map(row => ({
      email: row.email || row.Email || row.EMAIL,
      name: row.name || row.Name || row.NAME || '',
    })).filter(item => item.email);

    if (emailList.length === 0) {
      return NextResponse.json({ message: 'No valid emails found in the file' }, { status: 400 });
    }

    // Check if user has enough credits
    if (user.freeCredits < emailList.length) {
      return NextResponse.json({ 
        message: `Insufficient credits. You have ${user.freeCredits} credits but need ${emailList.length}` 
      }, { status: 400 });
    }

    // Create email campaign record
    const campaign = await EmailCampaign.create({
      userId: user._id,
      campaignName,
      emailList,
      subject,
      message,
      totalCount: emailList.length,
      status: 'sending',
    });

    // Send emails
    const result = await sendBulkEmails(
      emailList,
      subject,
      message,
      process.env.FROM_EMAIL
    );

    if (result.success) {
      // Update user credits
      await User.findByIdAndUpdate(user._id, {
        $inc: {
          freeCredits: -result.sent,
          usedCredits: result.sent,
        },
      });

      // Update campaign status
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        sentCount: result.sent,
        status: 'completed',
      });

      return NextResponse.json({
        message: `Successfully sent ${result.sent} emails. ${result.failed} failed.`,
        sent: result.sent,
        failed: result.failed,
      });
    } else {
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        status: 'failed',
      });

      return NextResponse.json({ 
        message: 'Failed to send emails', 
        error: result.error 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}