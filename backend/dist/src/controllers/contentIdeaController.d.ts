import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.ts';
export declare function generate(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function generateWithSteps(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function listPending(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function clearPending(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=contentIdeaController.d.ts.map