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
  SOFT_GRAY: "#F8F9FA",
  GOOGLE_BLUE: "#4285F4"
};

// --- Sub-component: Google Button ---
const GoogleLoginButton = ({ onClick }: { onClick?: () => void }) => (
  <Button
    variant="outline"
    onClick={onClick}
    className="w-full h-12 rounded-[16px] border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all duration-200 group mt-4"
  >
    <div className="flex items-center justify-center w-full gap-3">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: COLORS.GOOGLE_BLUE }}>
        Continue with Google
      </span>
    </div>
  </Button>
);

// --- Sub-component: Visual Divider ---
const AuthDivider = () => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-slate-100"></span>
    </div>
    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
      <span className="bg-white px-4 text-slate-300">Or</span>
    </div>
  </div>
);

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
                <AuthDivider />
                <GoogleLoginButton />
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
                <AuthDivider />
                <GoogleLoginButton />
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