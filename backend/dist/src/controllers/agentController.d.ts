/**
 * agentController.ts
 * Agentic Mode (PLAN.md §12) — thin proxy to ai-analyzer's /agent/* endpoints.
 * No business logic here: validate the role gate already ran, inject the
 * authenticated user's id server-side (never trust the client to assert
 * who triggered a run), forward to ai-analyzer, relay the response through
 * responseHelper. Same shape as imageGenerationClient.ts's role.
 */
import type { Request, Response } from 'express';
export declare const triggerAgent: (req: Request, res: Response) => Promise<Response>;
export declare const getAgentRun: (req: Request, res: Response) => Promise<Response>;
//# sourceMappingURL=agentController.d.ts.map