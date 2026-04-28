import type { Request, Response, NextFunction } from 'express';
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function login(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function logout(req: Request, res: Response): void;
export declare function refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getMe(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function resendOTP(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getRoles(_req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authController.d.ts.map