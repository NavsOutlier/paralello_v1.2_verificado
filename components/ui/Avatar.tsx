import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
    src?: string;
    name: string;
    size?: AvatarSize;
    className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
};

export const Avatar: React.FC<AvatarProps> = ({
    src,
    name,
    size = 'md',
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
        </div>
    );
};
