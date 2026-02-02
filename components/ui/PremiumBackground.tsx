import React from 'react';

// Circuit pattern SVG background
const CircuitPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M10 10h80v80H10z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="10" cy="10" r="3" fill="currentColor" />
                <circle cx="90" cy="10" r="3" fill="currentColor" />
                <circle cx="10" cy="90" r="3" fill="currentColor" />
                <circle cx="90" cy="90" r="3" fill="currentColor" />
                <circle cx="50" cy="50" r="4" fill="currentColor" />
                <path d="M10 50h30M60 50h30M50 10v30M50 60v30" stroke="currentColor" strokeWidth="0.5" />
                <path d="M25 25l25 25M75 25l-25 25M25 75l-25-25M75 75l-25-25" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2,2" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" className="text-cyan-400" />
    </svg>
);

// Animated grid lines
const GridLines = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{
            backgroundImage: `
                linear-gradient(to right, rgba(6, 182, 212, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
        }} />
        {/* Scanning line animation */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-scan" />
    </div>
);

// Floating particles
const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-float"
                style={{
                    left: `${15 + i * 15}%`,
                    top: `${20 + (i % 3) * 25}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3 + i * 0.5}s`
                }}
            />
        ))}
    </div>
);

export const PremiumBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#0a0f1a] z-0">
            {/* Background Effects */}
            <CircuitPattern />
            <GridLines />
            <FloatingParticles />

            {/* Gradient overlays */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />

            {/* CSS Animations (re-injecting locally if not globally available) */}
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(calc(100vh + 100%)); opacity: 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
                    25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
                    50% { transform: translateY(-10px) translateX(-5px); opacity: 0.3; }
                    75% { transform: translateY(-30px) translateX(5px); opacity: 0.5; }
                }
                .animate-scan {
                    animation: scan 10s linear infinite;
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
