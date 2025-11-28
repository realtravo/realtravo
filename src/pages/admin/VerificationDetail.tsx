import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

const VerificationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkAdminAndFetch = async () => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        navigate("/");
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        return;
      }

      await fetchVerification();
    };

    checkAdminAndFetch();
  }, [user, navigate, id]);

  const fetchVerification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("host_verifications")
        .select(`
          *,
          profiles!host_verifications_user_id_fkey (
            name,
            email
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setVerification(data);
      if (data.rejection_reason) {
        setRejectionReason(data.rejection_reason);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch verification details.",
        variant: "destructive",
      });
      navigate("/admin/verification");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("host_verifications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
          rejection_reason: null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Verification Approved",
        description: "The host verification has been approved successfully.",
      });

      navigate("/admin/verification");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve verification.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("host_verifications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
          rejection_reason: rejectionReason,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Verification Rejected",
        description: "The host verification has been rejected.",
      });

      navigate("/admin/verification");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject verification.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
      approved: { label: "Approved", variant: "default" as const, icon: CheckCircle },
      rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
    };
    const statusConfig = config[status as keyof typeof config];
    const Icon = statusConfig.icon;
    return (
      <Badge variant={statusConfig.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-8">
          <p className="text-center">Loading...</p>
        </main>
        <Footer />
        <MobileBottomBar />
      </div>
    );
  }

  if (!verification) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8 mb-20 md:mb-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/admin/verification/${verification.status}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Verification Details</h1>
            {getStatusBadge(verification.status)}
          </div>

          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>User Name</Label>
                <p className="text-sm mt-1">{verification.profiles?.name}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm mt-1">{verification.profiles?.email}</p>
              </div>
              <div>
                <Label>Legal Name</Label>
                <p className="text-sm mt-1">{verification.legal_name}</p>
              </div>
              <div>
                <Label>Document Type</Label>
                <p className="text-sm mt-1">
                  {verification.document_type.replace("_", " ").toUpperCase()}
                </p>
              </div>
            </div>

            <div>
              <Label>Residential Address</Label>
              <div className="text-sm mt-1 space-y-1">
                <p><span className="font-medium">Street:</span> {verification.street_address}</p>
                <p><span className="font-medium">City:</span> {verification.city}</p>
                {verification.postal_code && (
                  <p><span className="font-medium">Postal Code:</span> {verification.postal_code}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Label>Submitted Date</Label>
              <p className="text-sm mt-1">{new Date(verification.submitted_at).toLocaleString()}</p>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Verification Documents</Label>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm">Document Front Side</Label>
                  <div className="relative group">
                    <img
                      src={verification.document_front_url}
                      alt="Document front"
                      className="w-full max-w-2xl h-[500px] object-contain rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer bg-muted"
                      onClick={() => window.open(verification.document_front_url, "_blank")}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
                        Click to view full size
                      </span>
                    </div>
                  </div>
                </div>

                {verification.document_back_url && (
                  <div className="space-y-2">
                    <Label className="text-sm">Document Back Side</Label>
                    <div className="relative group">
                      <img
                        src={verification.document_back_url}
                        alt="Document back"
                        className="w-full max-w-2xl h-[500px] object-contain rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer bg-muted"
                        onClick={() => window.open(verification.document_back_url, "_blank")}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
                          Click to view full size
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">Selfie Verification</Label>
                  <div className="relative group">
                    <img
                      src={verification.selfie_url}
                      alt="Selfie"
                      className="w-full max-w-2xl h-[500px] object-contain rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer bg-muted"
                      onClick={() => window.open(verification.selfie_url, "_blank")}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
                        Click to view full size
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {verification.status === "pending" && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Select value={rejectionReason} onValueChange={setRejectionReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rejection reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Document does not match legal name.">
                        Document does not match legal name
                      </SelectItem>
                      <SelectItem value="Document not visible/blurry.">
                        Document not visible/blurry
                      </SelectItem>
                      <SelectItem value="Inappropriate/Invalid document.">
                        Inappropriate/Invalid document
                      </SelectItem>
                      <SelectItem value="Selfie does not match the document photo.">
                        Selfie does not match the document photo
                      </SelectItem>
                      <SelectItem value="custom">Custom Note</SelectItem>
                    </SelectContent>
                  </Select>
                  {rejectionReason === "custom" && (
                    <Textarea
                      className="mt-2"
                      placeholder="Enter custom rejection reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={isProcessing || !rejectionReason}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {verification.status === "rejected" && (
              <div className="bg-destructive/10 p-4 rounded-md">
                <Label>Rejection Reason</Label>
                <p className="text-sm mt-1">{verification.rejection_reason}</p>
              </div>
            )}

            {verification.reviewed_at && (
              <div className="text-sm text-muted-foreground pt-4 border-t">
                Reviewed on: {new Date(verification.reviewed_at).toLocaleString()}
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default VerificationDetail;
