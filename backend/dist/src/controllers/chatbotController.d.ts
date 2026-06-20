import type { Request, Response } from 'express';
export declare const sendMessage: (req: Request, res: Response) => Promise<void>;
export declare const getSessions: (req: Request, res: Response) => Promise<void>;
export declare const getSessionMessages: (req: Request, res: Response) => Promise<void>;
export declare const approveSchedule: (req: Request, res: Response) => Promise<void>;
export declare const rejectSchedule: (_req: Request, res: Response) => Promise<void>;
export declare const generateScheduleAgent: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=chatbotController.d.ts.map