export = roleMiddleware;
/**
 * Restrict route to one or more roles
 * Usage: router.get('/admin', authMiddleware, roleMiddleware(['admin']), handler)
 */
declare function roleMiddleware(allowedRoles?: any[]): (req: any, res: any, next: any) => any;
//# sourceMappingURL=roleMiddleware.d.ts.map