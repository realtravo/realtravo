import { Link } from "react-router-dom";
import {
  Compass,
  Facebook,
  Instagram,
  X,
  Mail,
  MessageSquare,
  Send as TikTok,
  Youtube,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  SOFT_GRAY: "#F8F9FA"
};

const socialLinks = {
  whatsapp: "https://wa.me/YOUR_WHATSAPP_NUMBER",
  facebook: "https://facebook.com/YOUR_PAGE",
  instagram: "https://instagram.com/YOUR_ACCOUNT",
  tiktok: "https://tiktok.com/@YOUR_ACCOUNT",
  x: "https://x.com/YOUR_ACCOUNT",
  youtube: "https://youtube.com/YOUR_CHANNEL",
  email: "mailto:hello@triptrac.com",
};

export const Footer = ({ className = "" }: { className?: string }) => {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const isInApp = () => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('inApp') === 'true' || /webview|wv|inapp/i.test(navigator.userAgent);
  };

  if (typeof window !== 'undefined' && window.innerWidth < 768 && isInApp()) {
    return null;
  }

  return (
    <footer className={`hidden md:block bg-white border-t border-slate-100 mt-20 pb-12 ${className}`}>
      <div className="container max-w-6xl mx-auto px-4 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#008080] p-2 rounded-xl shadow-lg shadow-[#008080]/20">
                <Compass className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                TripTrac
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed font-medium max-w-xs">
              Curating extraordinary experiences and hidden gems across the globe. Join our community of explorers.
            </p>
            <div className="pt-4">
               <a 
                href={socialLinks.email} 
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-[#008080] hover:text-white transition-all group"
               >
                <Mail className="h-4 w-4" />
                Contact Support
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-1 group-hover:ml-0" />
               </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-[10px] font-black text-[#FF7F50] uppercase tracking-[0.2em]">Platform</h3>
            <ul className="space-y-4">
              <FooterLink to="/">Home</FooterLink>
              <FooterLink to="/about">Our Story</FooterLink>
              <FooterLink to="/become-host">Host an Event</FooterLink>
              <FooterLink to="/install">Get the App</FooterLink>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h3 className="text-[10px] font-black text-[#FF7F50] uppercase tracking-[0.2em]">Explore</h3>
            <ul className="space-y-4">
              <FooterLink to="/category/trips">Curated Trips</FooterLink>
              <FooterLink to="/category/events">Local Events</FooterLink>
              <FooterLink to="/category/hotels">Boutique Stays</FooterLink>
              <FooterLink to="/category/adventure">Adventures</FooterLink>
            </ul>
          </div>

          {/* Social Grid Column */}
          <div className="md:col-span-4 space-y-6">
            <h3 className="text-[10px] font-black text-[#FF7F50] uppercase tracking-[0.2em]">Connect With Us</h3>
            <div className="grid grid-cols-3 gap-3">
              <SocialIcon href={socialLinks.whatsapp} icon={<MessageSquare />} label="WhatsApp" color="#25D366" />
              <SocialIcon href={socialLinks.instagram} icon={<Instagram />} label="Instagram" color="#E1306C" />
              <SocialIcon href={socialLinks.tiktok} icon={<TikTok />} label="TikTok" color="#000000" />
              <SocialIcon href={socialLinks.youtube} icon={<Youtube />} label="Youtube" color="#FF0000" />
              <SocialIcon href={socialLinks.facebook} icon={<Facebook />} label="Facebook" color="#1877F2" />
              <SocialIcon href={socialLinks.x} icon={<X />} label="Twitter" color="#000000" />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © 2025 TripTrac. Built for the modern explorer.
          </p>
          <div className="flex gap-8">
            <Link to="/terms-of-service" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#008080] transition-colors">
              Terms
            </Link>
            <Link to="/privacy-policy" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#008080] transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link 
      to={to} 
      className="text-xs font-black uppercase tracking-tight text-slate-600 hover:text-[#008080] transition-colors flex items-center gap-2 group"
    >
      <div className="h-1 w-0 bg-[#008080] transition-all group-hover:w-3" />
      {children}
    </Link>
  </li>
);

const SocialIcon = ({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group"
  >
    <div className="mb-1 text-slate-400 group-hover:scale-110 transition-transform" style={{ color: `${color}` }}>
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </div>
    <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-slate-900 transition-colors">
      {label}
    </span>
  </a>
);