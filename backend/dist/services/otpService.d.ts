export function generateOTP(): string;
export function storeOTP(email: any, otp: any, type?: string): Promise<void>;
export function verifyOTP(email: any, otp: any, type?: string): Promise<{
    valid: boolean;
    reason: string;
} | {
    valid: boolean;
    reason?: never;
}>;
export function invalidateOTP(email: any, type?: string): Promise<void>;
export function hasRecentOTP(email: any, type?: string): Promise<boolean>;
//# sourceMappingURL=otpService.d.ts.map