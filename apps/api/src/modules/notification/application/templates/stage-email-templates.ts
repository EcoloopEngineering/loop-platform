interface InstallReadyData {
  ownerName: string;
  customerName: string;
}

interface WonOwnerData {
  ownerName: string;
  customerName: string;
}

interface WonCustomerData {
  customerFirstName: string;
}

interface GenericStageData {
  customerName: string;
  stageName: string;
  previousStageName: string;
}

export function getInstallReadyEmail(data: InstallReadyData): string {
  return `
    <h2>Install Ready - Action Required</h2>
    <p>Hi ${data.ownerName},</p>
    <p>The installation for <strong>${data.customerName}</strong> is ready to be scheduled.</p>
    <p style="color: #DC2626; font-weight: bold;">⚠️ Reminder: A $1,000 no-show charge applies if the customer is not present at the scheduled installation time.</p>
    <p>Please confirm with the customer and schedule the installation.</p>
    <br>
    <p style="color: #6B7280; font-size: 12px;">— ecoLoop CRM</p>
  `;
}

export function getWonOwnerEmail(data: WonOwnerData): string {
  return `
    <h2>Congratulations!</h2>
    <p>Hi ${data.ownerName},</p>
    <p>The deal for <strong>${data.customerName}</strong> has been marked as <strong>WON</strong>! 🎉</p>
    <p>Great work closing this deal!</p>
    <br>
    <p style="color: #6B7280; font-size: 12px;">— ecoLoop CRM</p>
  `;
}

export function getWonCustomerEmail(data: WonCustomerData): string {
  return `
    <h2>Welcome to the ecoLoop Family!</h2>
    <p>Hi ${data.customerFirstName},</p>
    <p>Thank you for choosing ecoLoop for your solar energy project!</p>
    <p>Your project is now being processed and our team will be in touch shortly with next steps.</p>
    <p>If you have any questions, reply to this email or contact us at support@ecoloop.us.</p>
    <br>
    <p style="color: #6B7280; font-size: 12px;">— The ecoLoop Team</p>
  `;
}

export function getGenericStageEmail(data: GenericStageData): string {
  return `
    <h2>Lead Stage Updated</h2>
    <p>The lead for <strong>${data.customerName}</strong> has moved to <strong>${data.stageName}</strong>.</p>
    <p>Previous stage: ${data.previousStageName}</p>
    <br>
    <p style="color: #6B7280; font-size: 12px;">— ecoLoop CRM</p>
  `;
}
