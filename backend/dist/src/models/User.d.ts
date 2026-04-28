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
export declare function findAll({ page, limit, roleId }?: {
    page?: number;
    limit?: number;
    roleId?: string | null;
}): Promise<{
    users: unknown;
    total: number | null;
}>;
//# sourceMappingURL=User.d.ts.map