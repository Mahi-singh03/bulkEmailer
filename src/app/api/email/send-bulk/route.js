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

    // Email validation helper
    const isValidEmail = (email) => {
      if (!email || typeof email !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    };

    // Extract emails from Excel and validate
    const emailList = emailData
      .map(row => {
        const email = (row.email || row.Email || row.EMAIL || '').trim();
        const name = (row.name || row.Name || row.NAME || '').trim();
        return { email, name };
      })
      .filter(item => {
        if (!item.email) return false;
        if (!isValidEmail(item.email)) {
          console.warn(`Invalid email format detected: ${item.email}`);
          return false; // Filter out invalid emails
        }
        return true;
      });

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
      // Update individual email statuses in the campaign
      const emailResults = result.emailResults || [];
      const updatedEmailList = campaign.emailList.map((emailItem) => {
        // Convert Mongoose document to plain object if needed
        const emailObj = emailItem.toObject ? emailItem.toObject() : emailItem;
        const emailResult = emailResults.find(
          (r) => r.email === emailObj.email
        );
        
        if (emailResult) {
          return {
            email: emailObj.email,
            name: emailObj.name || '',
            status: emailResult.success ? 'sent' : 'failed',
          };
        }
        return {
          email: emailObj.email,
          name: emailObj.name || '',
          status: emailObj.status || 'pending',
        };
      });

      // Update user credits - only deduct for successfully sent emails
      // Verify the count matches
      const actualSentCount = result.sent || 0;
      
      if (actualSentCount > 0) {
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            freeCredits: -actualSentCount,
            usedCredits: actualSentCount,
          },
        });
      }

      // Update campaign with individual email statuses and final counts
      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        emailList: updatedEmailList,
        sentCount: actualSentCount,
        status: actualSentCount > 0 ? 'completed' : 'failed',
      });

      // Verify counts are accurate
      const totalExpected = emailList.length;
      const totalSent = actualSentCount;
      const totalFailed = result.failed || 0;
      const totalProcessed = totalSent + totalFailed;

      if (totalProcessed !== totalExpected) {
        console.error(`Count mismatch: Expected ${totalExpected}, got sent: ${totalSent}, failed: ${totalFailed}`);
      }

      return NextResponse.json({
        message: `Successfully sent ${totalSent} emails. ${totalFailed} failed.`,
        sent: totalSent,
        failed: totalFailed,
        total: totalExpected,
      });
    } else {
      // All emails failed
      const updatedEmailList = campaign.emailList.map((emailItem) => {
        const emailObj = emailItem.toObject ? emailItem.toObject() : emailItem;
        return {
          email: emailObj.email,
          name: emailObj.name || '',
          status: 'failed',
        };
      });

      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        emailList: updatedEmailList,
        status: 'failed',
        sentCount: 0,
      });

      return NextResponse.json({ 
        message: 'Failed to send emails', 
        error: result.error,
        sent: 0,
        failed: emailList.length,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}