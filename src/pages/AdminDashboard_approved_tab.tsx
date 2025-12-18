import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, MapPin, Calendar, Hash, Mail, Phone, Tag } from "lucide-react";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

export const ApprovedTab = ({ approvedListings, handleToggleVisibility }: any) => (
  <div className="space-y-6">
    {approvedListings.length === 0 ? (
      <div className="bg-white rounded-[28px] p-12 text-center border border-dashed border-slate-200">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No approved listings found</p>
      </div>
    ) : (
      approvedListings.map((item: any) => (
        <Card 
          key={item.id} 
          className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-300 rounded-[28px] bg-white p-2"
        >
          <div className="flex flex-col md:flex-row gap-6 p-4">
            {/* Image Section */}
            <div className="relative w-full md:w-48 h-48 shrink-0">
              <img 
                src={item.image_url} 
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover rounded-[20px]"
              />
              <div className="absolute top-3 left-3">
                <Badge 
                  className="border-none font-black uppercase tracking-tighter text-[10px] px-3 py-1 shadow-lg"
                  style={{ background: COLORS.TEAL, color: 'white' }}
                >
                  {item.type}
                </Badge>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-none" style={{ color: COLORS.TEAL }}>
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                      ID: {item.id.slice(0, 8)}
                    </Badge>
                    {item.establishment_type && (
                      <Badge className="bg-[#F0E68C]/30 text-[#857F3E] border-none font-black text-[10px] uppercase tracking-tighter">
                        {item.establishment_type}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                   {item.is_hidden && (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-black text-[10px] uppercase px-3">
                      Hidden
                    </Badge>
                  )}
                  <Badge 
                    className="font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full"
                    style={{ 
                      backgroundColor: item.approval_status === 'approved' ? '#E8F5E9' : '#FFEBEE',
                      color: item.approval_status === 'approved' ? '#2E7D32' : COLORS.RED
                    }}
                  >
                    {item.approval_status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                <InfoItem icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={`${item.location}, ${item.country}`} />
                <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="Created" value={new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
                
                {item.price && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Price:</span>
                    <span className="text-sm font-black text-red-500">KSh {item.price}</span>
                  </div>
                )}

                {item.registration_number && <InfoItem icon={<Hash className="h-3.5 w-3.5" />} label="Reg #" value={item.registration_number} />}
                {item.email && <InfoItem icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={item.email} isTruncated />}
                {(item.phone_number || item.phone_numbers) && (
                  <InfoItem 
                    icon={<Phone className="h-3.5 w-3.5" />} 
                    label="Contact" 
                    value={item.phone_number || item.phone_numbers?.join(', ')} 
                  />
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-50 flex justify-end">
                <Button 
                  onClick={() => handleToggleVisibility(item.id, item.type)}
                  className="rounded-xl px-6 font-black uppercase tracking-widest text-[11px] h-11 transition-all active:scale-95 shadow-lg border-none"
                  style={{ 
                    background: item.is_hidden 
                      ? `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` 
                      : '#F1F5F9',
                    color: item.is_hidden ? 'white' : '#64748B',
                  }}
                >
                  {item.is_hidden ? (
                    <><Eye className="h-4 w-4 mr-2" /> Publish Listing</>
                  ) : (
                    <><EyeOff className="h-4 w-4 mr-2" /> Hide Listing</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))
    )}
  </div>
);

const InfoItem = ({ icon, label, value, isTruncated = false }: { icon: React.ReactNode, label: string, value: string, isTruncated?: boolean }) => (
  <div className="flex items-center gap-2">
    <div className="text-slate-400">{icon}</div>
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-0.5">{label}</span>
      <span className={`text-[12px] font-bold text-slate-600 uppercase tracking-tight ${isTruncated ? 'truncate max-w-[150px]' : ''}`}>
        {value}
      </span>
    </div>
  </div>
);