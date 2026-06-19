import * as dashboardCalendarService from "../services/dashboardCalendarService.js";
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
export const getOwnerCalendar = async (req, res) => {
    try {
        const year = parseInt(req.query['year'], 10) || new Date().getFullYear();
        const month = parseInt(req.query['month'], 10) || (new Date().getMonth() + 1);
        if (month < 1 || month > 12) {
            error(res, { message: 'Invalid month value (1–12)', statusCode: 400 });
            return;
        }
        const schedules = await dashboardCalendarService.getOwnerCalendar(year, month);
        success(res, { message: 'Owner calendar loaded', data: { year, month, schedules } });
    }
    catch (err) {
        logger.error('[dashboardController.getOwnerCalendar]', err);
        error(res, { message: 'Failed to load owner calendar', statusCode: 500 });
    }
};
//# sourceMappingURL=dashboardController.js.map