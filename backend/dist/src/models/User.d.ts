export declare function findByEmail(email: string): Promise<Record<string, unknown> | null>;
export declare function findById(userId: string): Promise<Record<string, unknown> | null>;
export declare function emailExists(email: string): Promise<boolean>;
export declare function create({ email, passwordHash, roleId }: {
    email: string;
    passwordHash: string;
    roleId: string;
}): Promise<Record<string, unknown>>;
export declare function markEmailVerified(email: string): Promise<void>;
export declare function updatePassword(userId: string, passwordHash: string): Promise<void>;
export declare function setActive(userId: string, isActive: boolean): Promise<void>;
export declare function deleteById(userId: string): Promise<void>;
export declare function findAll({ page, limit, roleId }?: {
    page?: number;
    limit?: number;
    roleId?: string | null;
}): Promise<{
    users: unknown;
    total: number | null;
}>;
export declare function initiateRegistration({ email, password, fullName, phone, roleName }: {
    email: string;
    password: string;
    fullName: string;
    phone?: string | null;
    roleName: string;
}): Promise<{
    otpSent: boolean;
    devOtp?: string;
}>;
export declare function completeRegistration(email: string, otp: string): Promise<{
    user: Record<string, unknown>;
    accessToken: string;
    refreshToken: string;
}>;
export declare function login(email: string, password: string): Promise<{
    user: Record<string, unknown>;
    accessToken: string;
    refreshToken: string;
}>;
export declare function resendOTP(email: string, type?: string): Promise<{
    otpSent: boolean;
    devOtp?: string;
}>;
//# sourceMappingURL=User.d.ts.map