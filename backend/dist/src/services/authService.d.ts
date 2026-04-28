export declare function initiateRegistration({ email, password, fullName, phone, roleName }: {
    email: any;
    password: any;
    fullName: any;
    phone: any;
    roleName: any;
}): Promise<{
    otpSent: boolean;
}>;
export declare function completeRegistration(email: any, otp: any): Promise<{
    user: {
        userId: any;
        email: any;
        roleId: any;
        roleName: any;
        fullName: any;
        emailVerified: any;
        isActive: any;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function login(email: any, password: any): Promise<{
    user: {
        userId: any;
        email: any;
        roleId: any;
        roleName: any;
        fullName: any;
        emailVerified: any;
        isActive: any;
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function resendOTP(email: any, type?: string): Promise<{
    otpSent: boolean;
}>;
//# sourceMappingURL=authService.d.ts.map