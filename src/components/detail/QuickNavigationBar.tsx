import { Tent, Zap, Phone } from "lucide-react";

interface QuickNavigationBarProps {
  hasFacilities: boolean;
  hasActivities: boolean;
  hasContact: boolean;
}

export const QuickNavigationBar = ({ hasFacilities, hasActivities, hasContact }: QuickNavigationBarProps) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const items = [
    { id: 'facilities-section', label: 'Facilities', icon: Tent, show: hasFacilities },
    { id: 'activities-section', label: 'Activities', icon: Zap, show: hasActivities },
    { id: 'contact-section', label: 'Contact', icon: Phone, show: hasContact },
  ].filter(item => item.show);

  if (items.length === 0) return null;

  return (
    <div className="flex md:hidden gap-3 overflow-x-auto scrollbar-hide py-2 px-1 -mx-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollToSection(item.id)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl flex-shrink-0 transition-all active:scale-95 hover:bg-slate-800"
        >
          <item.icon className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-tight">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
