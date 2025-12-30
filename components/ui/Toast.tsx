import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

const toastIcons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

const toastStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
};

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    const Icon = toastIcons[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${toastStyles[type]} animate-slide-in-right`}>
            <Icon className={`w-5 h-5 ${iconStyles[type]}`} />
            <p className="text-sm font-medium flex-1">{message}</p>
            <button
                onClick={onClose}
                className="text-current opacity-50 hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
