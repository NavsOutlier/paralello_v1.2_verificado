/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Phone validation (basic Brazilian format)
 */
export function validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleaned = phone.replace(/[^\d+]/g, '');
    return phoneRegex.test(cleaned);
}

/**
 * Slug validation (lowercase alphanumeric with hyphens)
 */
export function validateSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
}

/**
 * Generate slug from string
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^\w\s-]/g, '')  // Remove special characters
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single
        .trim();
}

/**
 * Validate required fields
 */
export function validateRequired<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    requiredFields.forEach(field => {
        const value = data[field];
        if (value === undefined || value === null || value === '') {
            missing.push(String(field));
        }
    });

    return {
        valid: missing.length === 0,
        missing
    };
}
