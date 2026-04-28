export declare function generateOTP(): string;
export declare function storeOTP(email: string, otp: string, type?: string): Promise<void>;
export declare function verifyOTP(email: string, otp: string, type?: string): Promise<{
    valid: boolean;
    reason?: string;
}>;
export declare function invalidateOTP(email: string, type?: string): Promise<void>;
export declare function hasRecentOTP(email: string, type?: string): Promise<boolean>;
//# sourceMappingURL=otpService.d.ts.map