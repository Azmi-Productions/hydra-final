
// Helper: Get current username from cookie
export const getCookieUsername = () => {
    const match = document.cookie.match(new RegExp('(^| )username=([^;]+)'));
    if (match) return match[2];
    return null;
};
