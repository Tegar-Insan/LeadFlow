/**
 * mediaController.ts
 * UC008 – Upload Content Feed in Calendar
 * Uses content_assets table with queue_schedule_id + content_type_enum
 * LeadFlow – Krench Chicken
 */
import type { Request, Response } from 'express';
export declare const uploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadMedia: (req: Request, res: Response) => Promise<void>;
export declare const getMediaBySchedule: (req: Request, res: Response) => Promise<void>;
export declare const deleteMedia: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=mediaController.d.ts.map