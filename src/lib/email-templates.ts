/**
/**
 * HUXZAIN Premium Email Templates
 * Gold Accent: #D4AF37, Background: #0A0A0C, Text: #FFFFFF / #C0C0C6
 */

function getEmailWrapper(title: string, bodyContent: string): string {
  const siteUrl = process.env.VITE_SITE_URL || "https://huxzain.shop";
  return `
    <div style="background-color: #0A0A0C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #1A1A22; border-radius: 16px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #1A1A22; padding-bottom: 20px;">
        <h1 style="color: #D4AF37; font-size: 28px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase; font-family: 'Plus Jakarta Sans', sans-serif;">HUXZAIN</h1>
        <p style="color: #8F8F9A; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">India's Modern Digital Marketplace</p>
      </div>
      <!-- Content -->
      <div style="padding: 10px 10px;">
        <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 20px; border-left: 3px solid #D4AF37; padding-left: 12px; font-family: 'Plus Jakarta Sans', sans-serif;">${title}</h2>
        <div style="color: #C0C0C6; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
          ${bodyContent}
        </div>
      </div>
      <!-- Footer -->
      <div style="text-align: center; border-top: 1px solid #1A1A22; padding-top: 25px; margin-top: 30px; color: #60606A; font-size: 11px; line-height: 1.5;">
        <p style="margin: 0 0 8px 0;">You received this transactional email because you are a registered user of HUXZAIN.</p>
        <p style="margin: 0 0 15px 0;">© 2026 HUXZAIN. All rights reserved.</p>
        <div style="margin-top: 10px;">
          <a href="${siteUrl}" style="color: #D4AF37; text-decoration: none; font-weight: 600;">Visit Platform</a>
          <span style="color: #33333C; margin: 0 10px;">•</span>
          <a href="${siteUrl}/privacy" style="color: #D4AF37; text-decoration: none; font-weight: 600;">Privacy Policy</a>
        </div>
      </div>
    </div>
  `;
}

export const emailTemplates = {
  welcome: (username: string) => {
    const content = `
      <p>Hello <strong>${username}</strong>,</p>
      <p>Welcome to HUXZAIN, India's premier digital marketplace. We are thrilled to have you join our community of creators, traders, and buyers.</p>
      <p>With HUXZAIN, you can buy and sell digital products, game accounts, software licenses, and online services with absolute peace of mind, backed by our secure escrow payment and verification flow.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/login" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Access Your Dashboard</a>
      </div>
      <p>If you have any questions, our support team is available 24/7 to assist you.</p>
    `;
    return {
      subject: "Welcome to HUXZAIN!",
      html: getEmailWrapper("Welcome to HUXZAIN", content)
    };
  },

  orderConfirmation: (orderId: string, listingTitle: string, amount: string) => {
    const content = `
      <p>Thank you for your order! Your purchase has been registered successfully.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #121216; border: 1px solid #1A1A22; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Order ID</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${orderId}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Item</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${listingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Amount Paid</td>
          <td style="padding: 12px; color: #D4AF37; font-weight: bold; text-align: right;">${amount}</td>
        </tr>
      </table>
      <p>Your payment is currently held securely in HUXZAIN Escrow. The seller is notifying their delivery now.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/orders" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Track Order Status</a>
      </div>
    `;
    return {
      subject: `Order Confirmation: ${listingTitle}`,
      html: getEmailWrapper("Order Placed Successfully", content)
    };
  },

  paymentConfirmation: (orderId: string, amount: string) => {
    const content = `
      <p>Great news! We have verified your payment for order <strong>${orderId}</strong>.</p>
      <p>The funds are securely locked in HUXZAIN Escrow protection. The seller has been notified to proceed with immediate delivery of your product or service.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #121216; border: 1px solid #1A1A22; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Order ID</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${orderId}</td>
        </tr>
        <tr>
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Amount Verified</td>
          <td style="padding: 12px; color: #D4AF37; font-weight: bold; text-align: right;">${amount}</td>
        </tr>
      </table>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/orders" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Active Order</a>
      </div>
    `;
    return {
      subject: `Payment Verified for Order ${orderId}`,
      html: getEmailWrapper("Payment Confirmed & Verified", content)
    };
  },

  deliveryCompleted: (orderId: string, listingTitle: string) => {
    const content = `
      <p>The seller has marked your order for <strong>${listingTitle}</strong> as delivered!</p>
      <p>Please log in to your account, verify the credentials or files provided, and confirm the receipt. Once confirmed, the payment will be released to the seller.</p>
      <p style="color: #D4AF37; font-weight: 600;">Important Note: If you do not raise a dispute or confirm receipt within the protection period, the order will be automatically completed.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/orders" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Review & Confirm Delivery</a>
      </div>
    `;
    return {
      subject: `Action Required: Seller Delivered ${listingTitle}`,
      html: getEmailWrapper("Delivery Completed by Seller", content)
    };
  },

  reviewRequest: (orderId: string, listingTitle: string) => {
    const content = `
      <p>Your order for <strong>${listingTitle}</strong> has been completed successfully.</p>
      <p>Could you please take a moment to share your feedback and rate the seller? Your review helps keep the HUXZAIN marketplace trustworthy and assists other buyers.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/orders" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Leave a Review</a>
      </div>
    `;
    return {
      subject: `How was your purchase of ${listingTitle}?`,
      html: getEmailWrapper("Rate Your Experience", content)
    };
  },

  supportReply: (ticketId: string, ticketTitle: string, replyMessage: string) => {
    const content = `
      <p>You have received a new response on your support ticket: <strong>"${ticketTitle}"</strong>.</p>
      <div style="background-color: #121216; border: 1px solid #1A1A22; border-left: 3px solid #D4AF37; padding: 15px; border-radius: 8px; margin: 20px 0; color: #E0E0E6; font-style: italic;">
        "${replyMessage}"
      </div>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/account?tab=support" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Support Ticket</a>
      </div>
    `;
    return {
      subject: `New Support Reply: ${ticketTitle}`,
      html: getEmailWrapper("Support Team Response", content)
    };
  },

  disputeUpdate: (orderId: string, status: string, message: string) => {
    const content = `
      <p>There is an update regarding the dispute for order <strong>${orderId}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #121216; border: 1px solid #1A1A22; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Dispute Status</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right; text-transform: uppercase;">${status}</td>
        </tr>
      </table>
      <div style="background-color: #121216; border: 1px solid #1A1A22; padding: 15px; border-radius: 8px; margin: 20px 0; color: #E0E0E6;">
        <strong>Details:</strong><br/>
        ${message}
      </div>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/orders" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">View Dispute Details</a>
      </div>
    `;
    return {
      subject: `Dispute Update: Order ${orderId}`,
      html: getEmailWrapper("Dispute Escalation Update", content)
    };
  },

  payoutProcessed: (amount: string, upiId: string) => {
    const content = `
      <p>Congratulations! Your payout request has been processed and released successfully.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #121216; border: 1px solid #1A1A22; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Amount Transferred</td>
          <td style="padding: 12px; color: #D4AF37; font-weight: bold; text-align: right;">${amount}</td>
        </tr>
        <tr>
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Destination (UPI)</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${upiId}</td>
        </tr>
      </table>
      <p>The funds should be available in your bank account shortly. Thank you for choosing HUXZAIN as your marketplace.</p>
    `;
    return {
      subject: `Payout Released: ${amount}`,
      html: getEmailWrapper("Payout Processed Successfully", content)
    };
  },

  withdrawalApproved: (amount: string, referenceId: string) => {
    const content = `
      <p>Your withdrawal request has been approved by the finance team.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #121216; border: 1px solid #1A1A22; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Withdrawal Amount</td>
          <td style="padding: 12px; color: #D4AF37; font-weight: bold; text-align: right;">${amount}</td>
        </tr>
        <tr>
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Txn Reference ID</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${referenceId}</td>
        </tr>
      </table>
      <p>The transfer of funds is complete. Please check your linked account dashboard.</p>
    `;
    return {
      subject: `Withdrawal Approved: ${amount}`,
      html: getEmailWrapper("Withdrawal Completed", content)
    };
  },

  passwordReset: (resetLink: string) => {
    const content = `
      <p>We received a request to reset the password for your HUXZAIN account.</p>
      <p>Click the button below to secure a new password. This reset link will expire in 60 minutes.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Reset Account Password</a>
      </div>
      <p style="font-size: 12px; color: #60606A;">If you did not initiate this request, you can safely ignore this message. Your password will remain unchanged.</p>
    `;
    return {
      subject: "Reset your HUXZAIN password",
      html: getEmailWrapper("Password Reset Request", content)
    };
  },

  sellerVerification: (approved: boolean, reason?: string) => {
    const title = approved ? "Seller Application Approved" : "Seller Application Rejected";
    const content = approved
      ? `
      <p>Congratulations! Your seller registration request on HUXZAIN has been fully approved.</p>
      <p>You can now list digital products, game accounts, or services, set custom pricing, and start accepting secure payments.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.VITE_SITE_URL || "https://huxzain.shop"}/seller-panel" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Open Seller Panel</a>
      </div>
    `
      : `
      <p>Thank you for applying to be a seller on HUXZAIN.</p>
      <p>Unfortunately, your seller registration could not be approved at this time.</p>
      ${reason ? `<div style="background-color: #121216; border: 1px solid #1A1A22; border-left: 3px solid #FF4D4D; padding: 15px; border-radius: 8px; margin: 20px 0; color: #E0E0E6;"><strong>Reason for rejection:</strong><br/>${reason}</div>` : ""}
      <p>You can update your verification details and resubmit the application from your profile dashboard.</p>
    `;
    return {
      subject: `Seller Application Status Update - HUXZAIN`,
      html: getEmailWrapper(title, content)
    };
  },

  invoiceGenerated: (orderId: string, invoiceNumber: string, downloadUrl: string) => {
    const content = `
      <p>Your payment for order <strong>${orderId}</strong> has been successfully processed.</p>
      <p>The official HUXZAIN transaction invoice has been generated. You can view or download the copy using the link below.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #121216; border: 1px solid #1A1A22; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Invoice Number</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Order ID</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${orderId}</td>
        </tr>
      </table>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Download PDF Invoice</a>
      </div>
    `;
    return {
      subject: `Invoice ${invoiceNumber} for Order ${orderId}`,
      html: getEmailWrapper("Transaction Invoice Generated", content)
    };
  },

  paymentReuploadRequired: (paymentRef: string, orderRef: string, reason: string, uploadUrl: string) => {
    const content = `
      <p>Your payment screenshot requires another upload before we can verify it.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #121216; border: 1px solid #1A1A22; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Payment Reference</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${paymentRef || "N/A"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1A1A22;">
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Order Reference</td>
          <td style="padding: 12px; color: #FFFFFF; font-weight: 600; text-align: right;">${orderRef || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 12px; color: #8F8F9A; font-size: 13px;">Reason for Request</td>
          <td style="padding: 12px; color: #FFD200; font-weight: 600; text-align: right;">${reason}</td>
        </tr>
      </table>
      <p>Please upload a clearer screenshot of your payment proof using the button below to continue verification.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${uploadUrl}" style="display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Upload Again</a>
      </div>
    `;
    return {
      subject: "Payment Screenshot Re-upload Required",
      html: getEmailWrapper("Screenshot Re-upload Required", content)
    };
  }
};
