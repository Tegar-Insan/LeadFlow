export declare const ROLE_NAMES: {
    ADMIN: string;
    BUSINESS_OWNER: string;
    MARKETING_STAFF: string;
};
export declare function findAll(): Promise<Record<string, unknown>[]>;
export declare function findByName(roleName: string): Promise<Record<string, unknown> | null>;
export declare function findById(roleId: string): Promise<Record<string, unknown> | null>;
//# sourceMappingURL=Role.d.ts.map