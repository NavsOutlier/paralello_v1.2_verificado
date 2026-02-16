import React, { useState } from 'react';
import { Search, X, Check, Facebook, Loader2 } from 'lucide-react';
import { PremiumBackground } from '../ui/PremiumBackground';

interface AdAccount {
    id: string;
    name: string;
    account_id: string; // The numeric ID (without 'act_')
}

interface MetaAdAccountSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: AdAccount[];
    onSelect: (account: AdAccount) => void;
    isLoading: boolean;
}

export const MetaAdAccountSelector: React.FC<MetaAdAccountSelectorProps> = ({
    isOpen,
    onClose,
    accounts,
    onSelect,
    isLoading
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    const filteredAccounts = accounts.filter(account =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_id.includes(searchTerm)
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-[#0d121f] rounded-[2rem] border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                <PremiumBackground />

                {/* Header */}
                <div className="relative z-10 px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl">
                            <Facebook className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Escolher conta</h3>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                Selecione a conta do Meta Ads
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <X className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative z-10 p-6 pb-2">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar conta..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Account List */}
                <div className="relative z-10 flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar space-y-3">
                    {filteredAccounts.length > 0 ? (
                        filteredAccounts.map((account) => (
                            <button
                                key={account.id}
                                onClick={() => setSelectedAccountId(account.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${selectedAccountId === account.id
                                    ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                    : 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                                    }`}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selectedAccountId === account.id
                                            ? 'bg-blue-500 text-white shadow-lg'
                                            : 'bg-[#18181b] text-slate-500 group-hover:text-slate-300'
                                            }`}>
                                            <Facebook className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-bold transition-colors ${selectedAccountId === account.id ? 'text-white' : 'text-slate-300 group-hover:text-white'
                                                }`}>
                                                {account.name}
                                            </h4>
                                            <p className={`text-xs font-medium transition-colors ${selectedAccountId === account.id ? 'text-blue-200' : 'text-slate-500'
                                                }`}>
                                                ID: {account.account_id || account.id}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedAccountId === account.id && (
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            Nenhuma conta encontrada.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative z-10 px-8 py-6 bg-white/[0.01] border-t border-white/5 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-xs font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={!selectedAccountId || isLoading}
                        onClick={() => {
                            const account = accounts.find(a => a.id === selectedAccountId);
                            if (account) onSelect(account);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};
