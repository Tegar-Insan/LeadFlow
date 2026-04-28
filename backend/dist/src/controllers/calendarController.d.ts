import type { Request, Response } from 'express';
export declare const getCalendarByMonth: (req: Request, res: Response) => Promise<void>;
export declare const getDrafts: (_req: Request, res: Response) => Promise<void>;
export declare const getScheduleById: (req: Request, res: Response) => Promise<void>;
export declare const createSchedule: (req: Request, res: Response) => Promise<void>;
export declare const updateSchedule: (req: Request, res: Response) => Promise<void>;
export declare const moveSchedule: (req: Request, res: Response) => Promise<void>;
export declare const deleteSchedule: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=calendarController.d.ts.map