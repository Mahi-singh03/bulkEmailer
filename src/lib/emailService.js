import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBulkEmails(emailList, subject, htmlContent, fromEmail) {
  try {
    const emails = emailList.map(recipient => ({
      from: `Bulk Email App <${fromEmail}>`,
      to: recipient.email,
      subject: subject,
      html: htmlContent,
    }));

    const results = await Promise.allSettled(
      emails.map(email => resend.emails.send(email))
    );

    const sentEmails = results.filter(result => result.status === 'fulfilled').length;
    const failedEmails = results.filter(result => result.status === 'rejected').length;

    return {
      success: true,
      sent: sentEmails,
      failed: failedEmails,
      total: emailList.length,
    };
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}