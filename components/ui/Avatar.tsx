import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarStatus = 'online' | 'offline' | 'busy';

interface AvatarProps {
    src?: string;
    name: string;
    size?: AvatarSize;
    status?: AvatarStatus;
    className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
};

const statusClasses: Record<AvatarStatus, string> = {
    online: 'bg-green-500',
    offline: 'bg-slate-400',
    busy: 'bg-amber-500',
};

const statusSizeClasses: Record<AvatarSize, string> = {
    sm: 'w-2 h-2 bottom-0 right-0',
    md: 'w-2.5 h-2.5 bottom-0 right-0',
    lg: 'w-3 h-3 bottom-0.5 right-0.5',
};

export const Avatar: React.FC<AvatarProps> = ({
    src,
    name,
    size = 'md',
    status,
    className = ''
}) => {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className={`relative inline-block ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className={`${sizeClasses[size]} rounded-full object-cover`}
                />
            ) : (
                <div
                    className={`${sizeClasses[size]} rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold`}
                >
                    {initials}
                </div>
            )}

            {status && (
                <span
                    className={`absolute ${statusSizeClasses[size]} ${statusClasses[status]} rounded-full border-2 border-white`}
                    aria-label={status}
                />
            )}
        </div>
    );
};
