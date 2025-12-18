import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Check, Smartphone, Zap, Wifi, ArrowLeft, Share, PlusSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Interface for the PWA install prompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hasShownManualInstallToast, setHasShownManualInstallToast] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      toast({ title: "App Installed!", description: "TripTrac is ready on your home screen." });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;

    if (!deferredPrompt) {
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        if (isSmallScreen && !hasShownManualInstallToast) {
          toast({
            title: "iOS Instructions",
            description: "Tap Share then 'Add to Home Screen'",
          });
          setHasShownManualInstallToast(true);
        }
      } else {
        toast({
          title: "Browser Not Supported",
          description: "Try Chrome or Edge for the full App experience.",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing app:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // --- RENDER: ALREADY INSTALLED ---
  if (isInstalled) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-[40px] p-10 shadow-2xl border border-slate-100 max-w-md w-full text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-[#008080]/10 flex items-center justify-center mb-6">
            <Check className="h-10 w-10 text-[#008080]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2" style={{ color: COLORS.TEAL }}>Installed!</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">TripTrac is ready to explore</p>
          <Button
            onClick={() => navigate("/")}
            className="w-full py-7 rounded-2xl text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 border-none"
            style={{ background: COLORS.TEAL }}
          >
            Launch Experience
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header with Back Button */}
      <div className="p-6 flex justify-between items-center">
        <Button 
          onClick={() => navigate(-1)} 
          className="rounded-full bg-white shadow-md text-slate-800 border-none w-10 h-10 p-0 hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Setup App</span>
      </div>

      <main className="container px-6 max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex h-24 w-24 rounded-[32px] items-center justify-center text-white shadow-2xl mb-8 transform -rotate-3"
            style={{ background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #006666 100%)` }}
          >
            <span className="text-5xl font-black tracking-tighter">T</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-4" style={{ color: COLORS.TEAL }}>
            Unlock the <br /> <span style={{ color: COLORS.CORAL }}>Full Power</span>
          </h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Upgrade your travel experience</p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <FeatureCard 
            icon={<Wifi className="h-6 w-6" />} 
            title="Offline" 
            desc="Access trips in remote areas" 
          />
          <FeatureCard 
            icon={<Zap className="h-6 w-6" />} 
            title="Fast" 
            desc="No loading bars, just travel" 
          />
          <FeatureCard 
            icon={<Smartphone className="h-6 w-6" />} 
            title="Native" 
            desc="Full screen immersive UI" 
          />
        </div>

        {/* Action Card */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-100 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F0E68C]/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="relative z-10 text-center">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Ready to Install?</h2>
                <p className="text-slate-500 text-sm mb-8">Get TripTrac on your home screen for instant access to bookings.</p>

                <Button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full md:w-auto px-12 py-8 rounded-2xl text-md font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 border-none mb-6"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)`,
                    boxShadow: `0 12px 24px -8px ${COLORS.CORAL}88`
                  }}
                >
                  <Download className="h-5 w-5 mr-3" />
                  {isInstalling ? "Installing..." : "Install Now"}
                </Button>

                {/* iOS SPECIFIC INSTRUCTIONS */}
                {/iPhone|iPad|iPod/.test(navigator.userAgent) && (
                  <div className="mt-8 p-6 bg-[#F0E68C]/10 rounded-3xl border border-[#F0E68C]/30 text-left">
                    <h4 className="text-[11px] font-black text-[#857F3E] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Smartphone className="h-4 w-4" /> iOS Setup Guide
                    </h4>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm"><Share className="h-4 w-4 text-[#857F3E]" /></div>
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-tight leading-tight">1. Tap the <span className="text-[#857F3E]">Share button</span> in the Safari footer</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm"><PlusSquare className="h-4 w-4 text-[#857F3E]" /></div>
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-tight leading-tight">2. Select <span className="text-[#857F3E]">"Add to Home Screen"</span></p>
                        </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => navigate("/")}
                  className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-[#008080] transition-colors"
                >
                  Stay on Web Version
                </button>
            </div>
        </div>
      </main>
    </div>
  );
}

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center text-center">
    <div className="mb-4 p-3 rounded-2xl bg-[#F0E68C]/20 text-[#857F3E]">
      {icon}
    </div>
    <h3 className="text-sm font-black uppercase tracking-tight mb-1" style={{ color: COLORS.TEAL }}>{title}</h3>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{desc}</p>
  </div>
);