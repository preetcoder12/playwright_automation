/**
 * A wrapper for async express routes to catch errors and pass them to the error handler.
 * @param {Function} fn - The async function to wrap.
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
