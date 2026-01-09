
// Define the specified Teal color
const TEAL_COLOR = "#008080";
const TEAL_HOVER_COLOR = "#005555"; 

const HostVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [existingVerification, setExistingVerification] = useState<any>(null);

  // Form state
  const [legalName, setLegalName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      // Fetch user profile to auto-populate name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (profileData?.name) {
        setLegalName(profileData.name);
      }

      // Check if user already has a verification
      const { data, error } = await supabase
        .from("host_verifications")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setExistingVerification(data);
        
        if (data.status === "approved") {
          navigate("/become-host");
        }
      }
    };

    fetchData();
  }, [user, navigate]);

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from("verification-documents")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("verification-documents")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!legalName || !streetAddress || !city || !documentType) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
    } else if (currentStep === 2) {
      if (!documentFront || (documentType !== "passport" && !documentBack)) {
        toast({
          title: "Missing Documents",
          description: "Please upload all required documents.",
          variant: "destructive",
        });
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!selfie) {
      toast({
        title: "Missing Selfie",
        description: "Please upload your selfie.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", user!.id)
        .maybeSingle();

      if (profileCheckError) {
        console.error("Profile check error:", profileCheckError);
        throw new Error("Failed to verify user profile.");
      }

      if (!existingProfile) {
        const { error: createProfileError } = await supabase
          .from("profiles")
          .insert({
            id: user!.id,
            name: legalName,
            email: user!.email || "",
          });

        if (createProfileError) throw new Error("Failed to create user profile.");
      } else if (existingProfile.name !== legalName) {
        await supabase
          .from("profiles")
          .update({ name: legalName })
          .eq("id", user!.id);
      }

      const frontUrl = await uploadFile(documentFront!, `${user!.id}/document_front_${Date.now()}`);
      const backUrl = documentBack 
        ? await uploadFile(documentBack, `${user!.id}/document_back_${Date.now()}`)
        : null;
      const selfieUrl = await uploadFile(selfie, `${user!.id}/selfie_${Date.now()}`);

      const verificationData = {
        user_id: user!.id,
        legal_name: legalName,
        street_address: streetAddress,
        city: city,
        postal_code: postalCode || null,
        document_type: documentType,
        document_front_url: frontUrl,
        document_back_url: backUrl,
        selfie_url: selfieUrl,
        status: "pending",
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      };

      const { data: existingVer } = await supabase
        .from("host_verifications")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      let verificationError;
      if (existingVer) {
        const { error } = await supabase
          .from("host_verifications")
          .update(verificationData)
          .eq("user_id", user!.id);
        verificationError = error;
      } else {
        const { error } = await supabase
          .from("host_verifications")
          .insert(verificationData);
        verificationError = error;
      }

      if (verificationError) throw verificationError;

      toast({
        title: "Submission Successful",
        description: "Your identity is currently under review.",
      });

      navigate("/verification-status");
    } catch (error: any) {
      console.error("Verification submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit verification.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTealButtonStyle = () => ({
    backgroundColor: TEAL_COLOR,
    borderColor: TEAL_COLOR,
    color: 'white',
    transition: 'background-color 0.15s',
  });
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget.style as any).backgroundColor = TEAL_HOVER_COLOR;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget.style as any).backgroundColor = TEAL_COLOR;
  };

  if (existingVerification && existingVerification.status === "pending") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <Card className="max-w-2xl w-full p-8 text-center shadow-lg">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: TEAL_COLOR }} />
            <h1 className="text-2xl font-bold mb-4">Verification Pending</h1>
            <p className="text-muted-foreground mb-6">
              Your identity verification is currently under review. We will notify you of the result soon.
            </p>
            <Button 
              onClick={() => navigate("/")}
              style={getTealButtonStyle()}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="px-8"
            >
              Return to Home
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  if (existingVerification && existingVerification.status === "rejected") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <Card className="max-w-2xl w-full p-8 shadow-lg">
            <h1 className="text-2xl font-bold mb-4 text-destructive">Verification Failed</h1>
            <div className="bg-destructive/10 p-4 rounded-md mb-6">
              <p className="font-semibold mb-2">Rejection Reason:</p>
              <p className="text-muted-foreground">{existingVerification.rejection_reason}</p>
            </div>
            <Button 
              onClick={() => setExistingVerification(null)} 
              className="w-full"
              style={getTealButtonStyle()}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              Start Verification Process Again
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-0">
      <Header />
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-center">Verify Your Identity to Become a Host</h1>
          <p className="text-muted-foreground mb-8 text-center">
            Complete the following steps to verify your identity and gain access to hosting features.
          </p>

          <MultiStepForm
            currentStep={currentStep}
            totalSteps={3}
            title={
              currentStep === 1
                ? "Identity Details"
                : currentStep === 2
                ? "Document Uploads"
                : "Liveness Check"
            }
            description={
              currentStep === 1
                ? "Provide your legal information"
                : currentStep === 2
                ? "Upload your government-issued documents"
                : "Upload a selfie for verification"
            }
            onNext={handleNext}
            onPrev={handlePrev}
            onSubmit={handleSubmit}
            nextDisabled={false}
            isLoading={isLoading}
          >
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="legalName">Legal Name (Must match government ID) *</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Enter your full legal name"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-filled from your profile. You can edit it to match your ID.
                  </p>
                </div>
                <div>
                  <Label htmlFor="streetAddress">Street Address *</Label>
                  <Input
                    id="streetAddress"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Enter your street address"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter your city"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="documentType">Government Document Type *</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_licence">Driving Licence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <DocumentUploadWithCamera
                  documentType={documentType as any}
                  label={documentType === "passport" ? "Passport Photo Page" : "Front Side of Document"}
                  side="front"
                  file={documentFront}
                  onFileChange={setDocumentFront}
                  required
                />

                {documentType !== "passport" && (
                  <DocumentUploadWithCamera
                    documentType={documentType as any}
                    label="Back Side of Document"
                    side="back"
                    file={documentBack}
                    onFileChange={setDocumentBack}
                    required
                  />
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <DocumentUploadWithCamera
                  documentType={documentType as any}
                  label="Selfie for Verification"
                  side="selfie"
                  file={selfie}
                  onFileChange={setSelfie}
                  required
                />
              </div>
            )}
          </MultiStepForm>
        </div>
      </main>
    </div>
  );
};

export default HostVerification;
