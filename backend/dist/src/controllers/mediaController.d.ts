/**
 * mediaController.ts
 * UC008 – Upload Content Feed in Calendar
 * Uses content_assets table with queue_schedule_id + content_type_enum
 * LeadFlow – Krench Chicken
 */
export declare const uploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const uploadMedia: (req: any, res: any) => Promise<import("express").Response<any, Record<string, any>>>;
export declare const getMediaBySchedule: (req: any, res: any) => Promise<import("express").Response<any, Record<string, any>>>;
export declare const deleteMedia: (req: any, res: any) => Promise<import("express").Response<any, Record<string, any>>>;
//# sourceMappingURL=mediaController.d.ts.map