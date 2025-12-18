import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

const Auth = () => {
  const [activeTab, setActiveTab] = useState("login");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-[#F8F9FA] animate-pulse" />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />
      
      <main className="container px-4 pt-12 max-w-md mx-auto relative z-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 hover:bg-transparent p-0 group"
        >
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 group-hover:bg-[#008080] transition-colors mr-3">
            <ArrowLeft className="h-4 w-4 text-[#008080] group-hover:text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: COLORS.TEAL }}>
            Go Back
          </span>
        </Button>

        <div className="mb-8 text-center">
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2" style={{ color: COLORS.TEAL }}>
                Welcome
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Join the curated community
            </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-slate-100/50 rounded-[20px] mb-6">
            <TabsTrigger 
                value="login" 
                className="rounded-[16px] py-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm"
                style={{ color: activeTab === 'login' ? COLORS.TEAL : '#94a3b8' }}
            >
              <User className="h-3.5 w-3.5 mr-2" />
              Login
            </TabsTrigger>
            <TabsTrigger 
                value="signup" 
                className="rounded-[16px] py-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm"
                style={{ color: activeTab === 'signup' ? COLORS.TEAL : '#94a3b8' }}
            >
              <UserPlus className="h-3.5 w-3.5 mr-2" />
              Join
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <Card className="rounded-[28px] border-none shadow-2xl overflow-hidden bg-white">
              <CardHeader className="pt-8 pb-4 text-center">
                <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>
                    Welcome Back
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Access your curated experiences
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <LoginForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <Card className="rounded-[28px] border-none shadow-2xl overflow-hidden bg-white">
              <CardHeader className="pt-8 pb-4 text-center">
                <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>
                    Create Account
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Start your journey with us
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <SignupForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomBar />
    </div>
  );
};

export default Auth;