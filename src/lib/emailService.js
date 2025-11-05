import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Batch size to avoid rate limits (Resend typically allows 100 emails/second)
const BATCH_SIZE = 50;
const BATCH_DELAY = 1000; // 1 second delay between batches

// Email validation helper
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export async function sendBulkEmails(emailList, subject, htmlContent, fromEmail) {
  try {
    const emailResults = [];

    // Validate and clean FROM_EMAIL
    const cleanFromEmail = fromEmail?.trim();
    if (!cleanFromEmail || !isValidEmail(cleanFromEmail)) {
      throw new Error('Invalid FROM_EMAIL format. Must be a valid email address.');
    }

    // Format FROM email for Resend
    // Resend requires: "Display Name <email@domain.com>" or just "email@domain.com"
    // The domain must be verified in Resend dashboard
    const fromEmailFormatted = `Studybest <${cleanFromEmail}>`;

    // Process emails in batches to avoid rate limits
    for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
      const batch = emailList.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (recipient, index) => {
        try {
          // Validate recipient email
          const recipientEmail = recipient.email?.trim();
          if (!recipientEmail || !isValidEmail(recipientEmail)) {
            console.error(`Invalid recipient email: ${recipientEmail}`);
            return {
              success: false,
              email: recipientEmail || recipient.email,
              name: recipient.name,
              error: `Invalid email format: ${recipientEmail}`,
            };
          }

          const emailData = {
            from: fromEmailFormatted,
            to: recipientEmail,
            subject: subject,
            html: htmlContent,
          };

          const response = await resend.emails.send(emailData);
          
          // Check if Resend API actually accepted the email
          // Resend SDK returns { data: { id: '...', from: '...', to: '...', created_at: '...' } } on success
          // or { id: '...', ... } directly in some cases
          const hasValidId = response?.data?.id || response?.id;
          
          if (response && hasValidId) {
            return {
              success: true,
              email: recipientEmail,
              name: recipient.name,
              responseId: response.data?.id || response.id,
            };
          } else {
            // API call succeeded but email wasn't accepted
            console.error(`Email not accepted for ${recipientEmail}:`, response);
            return {
              success: false,
              email: recipientEmail,
              name: recipient.name,
              error: 'Email not accepted by API - may cause bounce',
              response: response,
            };
          }
        } catch (error) {
          console.error(`Error sending email to ${recipientEmail || recipient.email}:`, error);
          
          // Extract more detailed error information
          let errorMessage = 'Unknown error';
          if (error.message) {
            errorMessage = error.message;
          } else if (error.response?.body?.message) {
            errorMessage = error.response.body.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          // Check for common bounce-related errors
          const errorLower = errorMessage.toLowerCase();
          if (errorLower.includes('bounce') || errorLower.includes('invalid') || 
              errorLower.includes('unverified') || errorLower.includes('domain')) {
            errorMessage = `Bounce risk: ${errorMessage}`;
          }
          
          return {
            success: false,
            email: recipientEmail || recipient.email,
            name: recipient.name,
            error: errorMessage,
          };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          emailResults.push(result.value);
        } else {
          // Promise was rejected (shouldn't happen with our try-catch, but handle it)
          const recipient = batch[idx];
          emailResults.push({
            success: false,
            email: recipient.email,
            name: recipient.name,
            error: result.reason?.message || 'Promise rejected',
          });
        }
      });

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < emailList.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Count successful and failed emails
    const sentEmails = emailResults.filter(result => result.success === true);
    const failedEmails = emailResults.filter(result => result.success === false);

    // Verify counts match
    const totalProcessed = sentEmails.length + failedEmails.length;
    if (totalProcessed !== emailList.length) {
      console.error(`Email count mismatch: Expected ${emailList.length}, processed ${totalProcessed}`);
    }

    return {
      success: true,
      sent: sentEmails.length,
      failed: failedEmails.length,
      total: emailList.length,
      emailResults: emailResults, // Include detailed results for tracking
    };
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: emailList.length,
      total: emailList.length,
    };
  }
}