// backend/src/controllers/promptController.ts
// Thin controller delegating to models/Prompt.ts + models/ContentIdea.ts (MVC)
// SRS UC004 — read-side: list prompts + their generated ideas.
import * as Prompt from "../models/Prompt.js";
import * as ContentIdea from "../models/ContentIdea.js";
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
export async function listMyPrompts(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
        error(res, { message: 'Unauthorized', statusCode: 401 });
        return;
    }
    try {
        const prompts = await Prompt.listByUser(userId);
        success(res, { message: 'Prompts listed', data: { prompts }, statusCode: 200 });
    }
    catch (err) {
        logger.error('[promptController.listMyPrompts]', { err });
        error(res, { message: 'Failed to fetch prompts', statusCode: 500 });
    }
}
export async function getPromptDetail(req, res) {
    const userId = req.user?.userId;
    const { promptId } = req.params;
    if (!userId) {
        error(res, { message: 'Unauthorized', statusCode: 401 });
        return;
    }
    if (!promptId) {
        error(res, { message: 'promptId required', statusCode: 400 });
        return;
    }
    const prompt = await Prompt.findById(promptId, userId);
    if (!prompt) {
        error(res, { message: 'Prompt not found', statusCode: 404 });
        return;
    }
    try {
        // NOTE: ideas_count on prompts is total-ever (soft-delete consequence).
        const ideas = await ContentIdea.listByPromptId(promptId);
        success(res, { message: 'Prompt detail', data: { prompt, ideas }, statusCode: 200 });
    }
    catch (err) {
        logger.error('[promptController.getPromptDetail] ideas fetch', { err });
        error(res, { message: 'Failed to fetch ideas for prompt', statusCode: 500 });
    }
}
//# sourceMappingURL=promptController.js.map