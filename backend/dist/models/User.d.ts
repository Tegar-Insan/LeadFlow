export function findByEmail(email: any): Promise<{
    id: any;
    role_id: any;
    email: any;
    password_hash: any;
    is_active: any;
    email_verified: any;
    created_at: any;
    updated_at: any;
    roles: {
        id: any;
        name: any;
    }[];
    user_profiles: {
        id: any;
        full_name: any;
        phone: any;
    }[];
} | null>;
export function findById(userId: any): Promise<{
    id: any;
    role_id: any;
    email: any;
    password_hash: any;
    is_active: any;
    email_verified: any;
    created_at: any;
    updated_at: any;
    roles: {
        id: any;
        name: any;
    }[];
    user_profiles: {
        id: any;
        full_name: any;
        phone: any;
    }[];
} | null>;
export function emailExists(email: any): Promise<boolean>;
export function create({ email, passwordHash, roleId }: {
    email: any;
    passwordHash: any;
    roleId: any;
}): Promise<{
    id: any;
    role_id: any;
    email: any;
    is_active: any;
    email_verified: any;
    created_at: any;
    roles: {
        id: any;
        name: any;
    }[];
}>;
export function markEmailVerified(email: any): Promise<void>;
export function updatePassword(userId: any, passwordHash: any): Promise<void>;
export function setActive(userId: any, isActive: any): Promise<void>;
export function findAll({ page, limit, roleId }?: {
    page?: number | undefined;
    limit?: number | undefined;
    roleId?: null | undefined;
}): Promise<{
    users: {
        id: any;
        role_id: any;
        email: any;
        is_active: any;
        email_verified: any;
        created_at: any;
        roles: {
            id: any;
            name: any;
        }[];
        user_profiles: {
            full_name: any;
            phone: any;
        }[];
    }[];
    total: number | null;
}>;
//# sourceMappingURL=User.d.ts.map