import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.ts';
export declare function approveIdea(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function rejectIdea(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=IdeaValidationController.d.ts.map