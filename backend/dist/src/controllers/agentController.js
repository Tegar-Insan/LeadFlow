/**
 * agentController.ts
 * Agentic Mode (PLAN.md §12) — thin proxy to ai-analyzer's /agent/* endpoints.
 * No business logic here: validate the role gate already ran, inject the
 * authenticated user's id server-side (never trust the client to assert
 * who triggered a run), forward to ai-analyzer, relay the response through
 * responseHelper. Same shape as imageGenerationClient.ts's role.
 */
import axios from 'axios';
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
const AI_SERVICE_URL = process.env['AI_SERVICE_URL'] ?? 'http://127.0.0.1:8000';
export const triggerAgent = async (req, res) => {
    const authReq = req;
    if (!authReq.user) {
        return error(res, { message: 'Unauthorized', statusCode: 401 });
    }
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/agent/trigger`, { ...req.body, triggered_by: authReq.user.userId }, { timeout: 15_000 });
        return success(res, { message: 'Agent run started', data: response.data });
    }
    catch (err) {
        const e = err;
        logger.error('[agentController] trigger failed', { message: e.message, status: e.response?.status, data: e.response?.data });
        return error(res, {
            message: 'Failed to start agent run',
            statusCode: e.response?.status ?? 502,
            errors: e.response?.data,
        });
    }
};
export const getAgentRun = async (req, res) => {
    const { runId } = req.params;
    try {
        const response = await axios.get(`${AI_SERVICE_URL}/agent/runs/${runId}`, { timeout: 10_000 });
        return success(res, { data: response.data });
    }
    catch (err) {
        const e = err;
        if (e.response?.status === 404) {
            return error(res, { message: 'Agent run not found', statusCode: 404 });
        }
        logger.error('[agentController] getAgentRun failed', { message: e.message, status: e.response?.status });
        return error(res, { message: 'Failed to fetch agent run', statusCode: e.response?.status ?? 502 });
    }
};
//# sourceMappingURL=agentController.js.map