export function sendOTPEmail(toEmail: any, otp: any, recipientName?: string, type?: string): Promise<{
    messageId: string;
    devOtp: any;
} | {
    messageId: string;
    devOtp?: never;
}>;
//# sourceMappingURL=emailService.d.ts.map