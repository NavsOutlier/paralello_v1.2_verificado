import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    title?: string;
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

export const Toast: React.FC<ToastProps> = ({ title, message, type, onClose, duration = 3000 }) => {
    const Icon = toastIcons[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${toastStyles[type]} animate-slide-in-right max-w-sm`}>
            <Icon className={`w-5 h-5 mt-0.5 ${iconStyles[type]}`} />
            <div className="flex-1 min-w-0">
                {title && <h5 className="text-sm font-bold mb-0.5">{title}</h5>}
                <p className="text-xs font-medium leading-relaxed opacity-90">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="text-current opacity-50 hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
