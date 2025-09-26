import createError from 'http-errors';

export const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    });
};

export const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }),
        timestamp: new Date().toISOString(),
    });
};

export const sendValidationError = (res, errors) => {
    return sendError(res, 'Validation failed', 400, errors);
};

// Http-errors helper functions
export const throwBadRequest = (message = 'Bad Request') => {
    throw createError(400, message);
};

export const throwUnauthorized = (message = 'Unauthorized') => {
    throw createError(401, message);
};

export const throwForbidden = (message = 'Forbidden') => {
    throw createError(403, message);
};

export const throwNotFound = (message = 'Not Found') => {
    throw createError(404, message);
};

export const throwConflict = (message = 'Conflict') => {
    throw createError(409, message);
};

export const throwInternalServerError = (message = 'Internal Server Error') => {
    throw createError(500, message);
};
