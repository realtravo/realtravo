import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BankDetailsSection } from "@/components/host/BankDetailsSection";

export default function HostBankDetails() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      
      <main className="container px-4 max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/account")}
          className="w-fit rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 px-6 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2 text-teal-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Back to Account</span>
        </Button>

        <BankDetailsSection />
      </main>

      <MobileBottomBar />
    </div>
  );
}
