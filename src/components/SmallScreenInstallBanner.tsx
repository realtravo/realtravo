import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function SmallScreenInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if banner was dismissed
    const bannerDismissed = localStorage.getItem('installBannerDismissed');
    if (bannerDismissed) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
    });

    // Show banner for iOS (no beforeinstallprompt event)
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !bannerDismissed) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setShowBanner(false);
          localStorage.setItem('installBannerDismissed', 'true');
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error installing app:', error);
      }
    } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // iOS instructions - just close banner since they need to use Share button
      alert("Tap the Share button at the bottom of the browser, then 'Add to Home Screen'");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('installBannerDismissed', 'true');
  };

  // Don't show if already installed or not on mobile or banner hidden
  if (isInstalled || !isMobile || !showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#008080] text-white px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Download className="h-4 w-4 flex-shrink-0" />
        <p className="text-xs font-medium truncate">
          Install the app for a better experience
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleInstallClick}
          className="h-7 px-3 text-xs font-bold bg-white text-[#008080] hover:bg-white/90 rounded-full"
        >
          Install
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
          className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
