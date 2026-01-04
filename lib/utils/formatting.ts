/**
 * Format date to Brazilian locale
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (format === 'iso') {
        return d.toISOString();
    }

    const options: Intl.DateTimeFormatOptions = format === 'long'
        ? { day: '2-digit', month: 'long', year: 'numeric' }
        : { day: '2-digit', month: 'short', year: 'numeric' };

    return d.toLocaleDateString('pt-BR', options);
}

/**
 * Format currency to Brazilian Real
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount);
}

/**
 * Format currency to USD
 */
export function formatCurrencyUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Truncate ID to show first and last characters
 */
export function truncateId(id: string, prefixLen: number = 2, suffixLen: number = 2): string {
    if (id.length <= prefixLen + suffixLen) return id;
    return `${id.substring(0, prefixLen)}...${id.substring(id.length - suffixLen)}`;
}

/**
 * Format phone number to Brazilian format
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 11) {
        return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    if (cleaned.length === 10) {
        return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }

    return phone;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'agora';
    if (diffMin < 60) return `${diffMin}m atrás`;
    if (diffHour < 24) return `${diffHour}h atrás`;
    if (diffDay < 7) return `${diffDay}d atrás`;

    return formatDate(d);
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Pluralize text based on count
 */
export function pluralize(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
}

/**
 * Format time to HH:MM
 */
export const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};
