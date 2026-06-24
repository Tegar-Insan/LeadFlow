import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.ts';
export declare function listNotifications(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=notificationController.d.ts.map