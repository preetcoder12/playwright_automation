/**
 * Standardizes the API response format.
 * @param {boolean} success - Whether the operation was successful.
 * @param {string} message - A message describing the result.
 * @param {object} [data] - Optional data to include in the response.
 * @returns {object} The formatted response object.
 */
const formatResponse = (success, message, data = null) => {
    return {
        success,
        message,
        data,
        timestamp: new Date().toISOString()
    };
};

/**
 * Validates if a string is a valid email address.
 * @param {string} email 
 * @returns {boolean}
 */
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

/**
 * Generates a simple random string for IDs.
 * @param {number} length 
 * @returns {string}
 */
const generateRandomId = (length = 8) => {
    return Math.random().toString(10).substring(2, 2 + length);
};

/**
 * Capitalizes the first letter of each word in a string.
 * @param {string} str 
 * @returns {string}
 */
const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Adds a dot after each letter in a string.
 * @param {string} str 
 * @returns {string}
 */
const dotaftereachletter = (str) => {
    return str.split('').join('.');
};


/**
 * Reverses a string.   
 * @param {string} str 
 * @returns {string}
 */
const reverseword = (str) => {
    return str.split('').reverse().join('');
};

/**
 * Masks an email for privacy (e.g., p****@example.com).
 * @param {string} email 
 * @returns {string}
 */
const maskEmail = (email) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return `${name[0]}${new Array(name.length).join('*')}@${domain}`;
};

/**
 * @param {string} str
 * @returns {string}
 */
const reverse_dotremoval = (str) => {
    const reverse = reverseword(str);
    const dotremoval = reverse.replace(/\./g, '');
    return dotremoval;
}

module.exports = {
    formatResponse,
    isValidEmail,
    generateRandomId,
    capitalizeWords,
    dotaftereachletter,
    reverseword,
    maskEmail,
    reverse_dotremoval
};
