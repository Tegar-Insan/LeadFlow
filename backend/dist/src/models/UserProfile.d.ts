export declare function create({ userId, fullName, phone }: {
    userId: string;
    fullName: string;
    phone?: string | null;
}): Promise<Record<string, unknown>>;
export declare function findByUserId(userId: string): Promise<Record<string, unknown> | null>;
export declare function update(userId: string, { fullName, phone, profilePhotoUrl }: {
    fullName?: string;
    phone?: string | null;
    profilePhotoUrl?: string | null;
}): Promise<Record<string, unknown>>;
//# sourceMappingURL=UserProfile.d.ts.map