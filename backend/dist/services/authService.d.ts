export function initiateRegistration({ email, password, fullName, phone, roleName }: {
    email: any;
    password: any;
    fullName: any;
    phone: any;
    roleName: any;
}): Promise<{
    otpSent: boolean;
}>;
export function completeRegistration(email: any, otp: any): Promise<{
    user: {
        userId: any;
        email: any;
        roleId: any;
        roleName: any;
        fullName: any;
        emailVerified: any;
        isActive: any;
    };
    accessToken: never;
    refreshToken: never;
}>;
export function login(email: any, password: any): Promise<{
    user: {
        userId: any;
        email: any;
        roleId: any;
        roleName: any;
        fullName: any;
        emailVerified: any;
        isActive: any;
    };
    accessToken: never;
    refreshToken: never;
}>;
export function resendOTP(email: any, type?: string): Promise<{
    otpSent: boolean;
}>;
//# sourceMappingURL=authService.d.ts.map