import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void; // Updated to allow async
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger'
}) => {
    const [isConfirming, setIsConfirming] = React.useState(false);

    if (!isOpen) return null;

    const colors = {
        danger: 'text-rose-600 bg-rose-50 border-rose-100',
        warning: 'text-amber-600 bg-amber-50 border-amber-100',
        info: 'text-blue-600 bg-blue-50 border-blue-100'
    };

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
                onClick={!isConfirming ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-white/50 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl border ${colors[variant]}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isConfirming}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">
                        {title}
                    </h3>

                    <p className="text-slate-500 leading-relaxed font-medium">
                        {message}
                    </p>

                    <div className="flex gap-3 mt-10">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isConfirming}
                            className="flex-1 h-14 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 border-slate-200 disabled:opacity-50"
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className={`flex-1 h-14 rounded-2xl font-bold shadow-lg shadow-rose-100 ${variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {isConfirming ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Excluindo...</span>
                                </div>
                            ) : confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
