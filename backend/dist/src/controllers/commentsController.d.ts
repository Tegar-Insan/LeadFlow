import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.ts';
export declare function listComments(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function createComment(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function deleteComment(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=commentsController.d.ts.map