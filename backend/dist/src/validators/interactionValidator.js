/**
 * Validate send message request
 * Throws error if validation fails
 */
export function validateSendMessage(body) {
    if (!body || typeof body !== 'object') {
        const err = new Error('Request body is required');
        err.statusCode = 400;
        throw err;
    }
    const { receiverId, messageText } = body;
    // Validate receiverId
    if (!receiverId || typeof receiverId !== 'string' || receiverId.trim() === '') {
        const err = new Error('receiverId is required and must be a non-empty string');
        err.statusCode = 400;
        throw err;
    }
    // Validate messageText
    if (!messageText || typeof messageText !== 'string') {
        const err = new Error('messageText is required and must be a string');
        err.statusCode = 400;
        throw err;
    }
    const trimmedMessage = messageText.trim();
    if (trimmedMessage.length === 0) {
        const err = new Error('messageText cannot be empty');
        err.statusCode = 400;
        throw err;
    }
    if (trimmedMessage.length > 5000) {
        const err = new Error('messageText cannot exceed 5000 characters');
        err.statusCode = 400;
        throw err;
    }
    return {
        receiverId: receiverId.trim(),
        messageText: trimmedMessage,
    };
}
/**
 * Validate delete message request
 */
export function validateDeleteMessage(body) {
    if (!body || typeof body !== 'object') {
        const err = new Error('Request body is required');
        err.statusCode = 400;
        throw err;
    }
    const { messageId } = body;
    if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
        const err = new Error('messageId is required and must be a non-empty string');
        err.statusCode = 400;
        throw err;
    }
    return {
        messageId: messageId.trim(),
    };
}
/**
 * Validate message query parameters
 */
export function validateGetMessagesQuery(query) {
    if (!query || typeof query !== 'object') {
        const err = new Error('Query parameters required');
        err.statusCode = 400;
        throw err;
    }
    const { recipientId, limit, offset } = query;
    if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
        const err = new Error('recipientId query parameter is required');
        err.statusCode = 400;
        throw err;
    }
    let parsedLimit = 50;
    if (limit !== undefined) {
        const limitNum = Number(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            const err = new Error('limit must be a number between 1 and 100');
            err.statusCode = 400;
            throw err;
        }
        parsedLimit = limitNum;
    }
    let parsedOffset = 0;
    if (offset !== undefined) {
        const offsetNum = Number(offset);
        if (isNaN(offsetNum) || offsetNum < 0) {
            const err = new Error('offset must be a non-negative number');
            err.statusCode = 400;
            throw err;
        }
        parsedOffset = offsetNum;
    }
    return {
        recipientId: recipientId.trim(),
        limit: parsedLimit,
        offset: parsedOffset,
    };
}
/**
 * Validate sender and receiver are not the same
 */
export function validateDifferentUsers(senderId, receiverId) {
    if (senderId === receiverId) {
        const err = new Error('Cannot send message to yourself');
        err.statusCode = 400;
        throw err;
    }
}
/**
 * Validate user has permission to delete message (sender only)
 */
export function validateDeletePermission(senderId, currentUserId) {
    if (senderId !== currentUserId) {
        const err = new Error('Only message sender can delete this message');
        err.statusCode = 403;
        throw err;
    }
}
//# sourceMappingURL=interactionValidator.js.map