import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
    src?: string;
    name: string;
    size?: AvatarSize;
    className?: string;
    rounded?: string;
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
    className = '',
    rounded = 'rounded-full'
}) => {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const baseClasses = `${sizeClasses[size]} ${rounded} object-cover`;

    return (
        <div className={`relative inline-block ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className={baseClasses}
                />
            ) : (
                <div
                    className={`${baseClasses} bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold shadow-inner`}
                >
                    {initials}
                </div>
            )}
        </div>
    );
};
