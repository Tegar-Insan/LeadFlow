export function getProfile(req: any, res: any): Promise<any>;
export function updateProfile(req: any, res: any): Promise<any>;
export function changePassword(req: any, res: any): Promise<any>;
export function uploadPhoto(req: any, res: any): Promise<any>;
export function deletePhoto(req: any, res: any): Promise<any>;
export function getPhotoHistory(req: any, res: any): Promise<any>;
export const photoUploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
//# sourceMappingURL=profileController.d.ts.map