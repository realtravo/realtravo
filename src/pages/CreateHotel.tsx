import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DynamicItemListWithImages, uploadItemImages, formatItemsWithImagesForDB } from "./DynamicItemListWithImages";
import { Upload, X, Loader2 } from "lucide-react";
import type { DynamicItemWithImages } from "./DynamicItemListWithImages";

// =====================================================
// INTERFACES
// =====================================================
interface HotelFormData {
  // Basic Information
  name: string;
  description: string;
  hotelType: string;
  starRating: number;
  
  // Location
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  
  // Contact Information
  phone: string;
  email: string;
  website: string;
  
  // Hotel Details
  totalRooms: number;
  checkInTime: string;
  checkOutTime: string;
  
  // Policies
  cancellationPolicy: string;
  petPolicy: string;
  smokingPolicy: string;
  
  // Media
  mainImage: File | null;
  additionalImages: File[];
  videoUrl: string;
}

interface Room {
  id: string;
  name: string;
  roomType: string;
  description: string;
  maxOccupancy: number;
  numBeds: number;
  bedType: string;
  basePrice: string;
  roomSize: string;
  hasBalcony: boolean;
  hasKitchen: boolean;
  hasWorkspace: boolean;
  viewType: string;
  tempImages: File[];
  amenities: string[];
}

interface Amenity {
  id: string;
  name: string;
  category: string;
}

export const CreateHotelForm: React.FC = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // =====================================================
  // FORM STATE
  // =====================================================
  const [formData, setFormData] = useState<HotelFormData>({
    name: "",
    description: "",
    hotelType: "resort",
    starRating: 3,
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    phone: "",
    email: "",
    website: "",
    totalRooms: 0,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    cancellationPolicy: "",
    petPolicy: "not_allowed",
    smokingPolicy: "not_allowed",
    mainImage: null,
    additionalImages: [],
    videoUrl: ""
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [facilities, setFacilities] = useState<DynamicItemWithImages[]>([]);
  const [activities, setActivities] = useState<DynamicItemWithImages[]>([]);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);

  // =====================================================
  // FORM HANDLERS
  // =====================================================
  const handleInputChange = (field: keyof HotelFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, mainImage: file }));
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdditionalImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, additionalImages: [...prev.additionalImages, ...files] }));
    const previews = files.map(file => URL.createObjectURL(file));
    setAdditionalImagePreviews(prev => [...prev, ...previews]);
  };

  const removeAdditionalImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index)
    }));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // =====================================================
  // ROOM MANAGEMENT
  // =====================================================
  const addRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: "",
      roomType: "double",
      description: "",
      maxOccupancy: 2,
      numBeds: 1,
      bedType: "queen",
      basePrice: "",
      roomSize: "",
      hasBalcony: false,
      hasKitchen: false,
      hasWorkspace: false,
      viewType: "city",
      tempImages: [],
      amenities: []
    };
    setRooms(prev => [...prev, newRoom]);
  };

  const removeRoom = (id: string) => {
    setRooms(prev => prev.filter(room => room.id !== id));
  };

  const updateRoom = (id: string, field: keyof Room, value: any) => {
    setRooms(prev => prev.map(room =>
      room.id === id ? { ...room, [field]: value } : room
    ));
  };

  const handleRoomImageUpload = (roomId: string, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, tempImages: [...room.tempImages, ...newFiles] } : room
    ));
  };

  // =====================================================
  // AMENITY MANAGEMENT
  // =====================================================
  const addAmenity = () => {
    const newAmenity: Amenity = {
      id: Date.now().toString(),
      name: "",
      category: "general"
    };
    setAmenities(prev => [...prev, newAmenity]);
  };

  const removeAmenity = (id: string) => {
    setAmenities(prev => prev.filter(amenity => amenity.id !== id));
  };

  const updateAmenity = (id: string, field: keyof Amenity, value: any) => {
    setAmenities(prev => prev.map(amenity =>
      amenity.id === id ? { ...amenity, [field]: value } : amenity
    ));
  };

  // =====================================================
  // IMAGE UPLOAD TO STORAGE
  // =====================================================
  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // =====================================================
  // FORM VALIDATION
  // =====================================================
  const validateStep1 = (): boolean => {
    if (!formData.name || !formData.description || !formData.address || 
        !formData.city || !formData.country || !formData.phone || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields in Basic Information.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (rooms.length === 0) {
      toast({
        title: "No Rooms Added",
        description: "Please add at least one room type.",
        variant: "destructive"
      });
      return false;
    }

    for (const room of rooms) {
      if (!room.name || !room.basePrice || room.tempImages.length === 0) {
        toast({
          title: "Incomplete Room",
          description: `Room "${room.name || 'Unnamed'}" is missing required information.`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  // =====================================================
  // FORM SUBMISSION
  // =====================================================
  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Upload main image
      let mainImageUrl = "";
      if (formData.mainImage) {
        mainImageUrl = await uploadImage(formData.mainImage, user.id) || "";
      }

      // Upload additional images
      const additionalImageUrls: string[] = [];
      for (const image of formData.additionalImages) {
        const url = await uploadImage(image, user.id);
        if (url) additionalImageUrls.push(url);
      }

      // Insert hotel
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description,
          hotel_type: formData.hotelType,
          star_rating: formData.starRating,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postal_code: formData.postalCode,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          total_rooms: formData.totalRooms,
          check_in_time: formData.checkInTime,
          check_out_time: formData.checkOutTime,
          cancellation_policy: formData.cancellationPolicy,
          pet_policy: formData.petPolicy,
          smoking_policy: formData.smokingPolicy,
          main_image_url: mainImageUrl,
          images: additionalImageUrls,
          video_url: formData.videoUrl,
          is_published: false
        })
        .select()
        .single();

      if (hotelError) throw hotelError;

      // Insert rooms
      for (const room of rooms) {
        const roomImageUrls: string[] = [];
        for (const image of room.tempImages) {
          const url = await uploadImage(image, user.id);
          if (url) roomImageUrls.push(url);
        }

        const { data: insertedRoom, error: roomError } = await supabase
          .from('rooms')
          .insert({
            hotel_id: hotel.id,
            name: room.name,
            room_type: room.roomType,
            description: room.description,
            max_occupancy: room.maxOccupancy,
            num_beds: room.numBeds,
            bed_type: room.bedType,
            base_price: parseFloat(room.basePrice),
            room_size: room.roomSize ? parseFloat(room.roomSize) : null,
            has_balcony: room.hasBalcony,
            has_kitchen: room.hasKitchen,
            has_workspace: room.hasWorkspace,
            view_type: room.viewType,
            images: roomImageUrls
          })
          .select()
          .single();

        if (roomError) throw roomError;

        // Insert room amenities
        if (room.amenities.length > 0) {
          const roomAmenities = room.amenities.map(amenityName => ({
            room_id: insertedRoom.id,
            name: amenityName,
            category: 'room'
          }));

          const { error: amenityError } = await supabase
            .from('room_amenities')
            .insert(roomAmenities);

          if (amenityError) throw amenityError;
        }
      }

      // Insert amenities
      if (amenities.length > 0) {
        const amenityData = amenities
          .filter(a => a.name.trim() !== "")
          .map(amenity => ({
            hotel_id: hotel.id,
            name: amenity.name,
            category: amenity.category
          }));

        if (amenityData.length > 0) {
          const { error: amenityError } = await supabase
            .from('amenities')
            .insert(amenityData);

          if (amenityError) throw amenityError;
        }
      }

      // Insert facilities
      if (facilities.length > 0) {
        const uploadedFacilities = await uploadItemImages(facilities, user.id);
        const facilityData = formatItemsWithImagesForDB(uploadedFacilities).map(f => ({
          hotel_id: hotel.id,
          name: f.name,
          price: f.price,
          is_free: f.is_free,
          capacity: f.capacity,
          booking_link: f.booking_link,
          images: f.images
        }));

        if (facilityData.length > 0) {
          const { error: facilityError } = await supabase
            .from('facilities')
            .insert(facilityData);

          if (facilityError) throw facilityError;
        }
      }

      // Insert activities
      if (activities.length > 0) {
        const uploadedActivities = await uploadItemImages(activities, user.id);
        const activityData = formatItemsWithImagesForDB(uploadedActivities).map(a => ({
          hotel_id: hotel.id,
          name: a.name,
          price: a.price,
          is_free: a.is_free,
          booking_link: a.booking_link,
          images: a.images
        }));

        if (activityData.length > 0) {
          const { error: activityError } = await supabase
            .from('activities')
            .insert(activityData);

          if (activityError) throw activityError;
        }
      }

      toast({
        title: "Success!",
        description: "Hotel created successfully.",
      });

      // Reset form or redirect
      // You can add navigation here

    } catch (error: any) {
      console.error('Error creating hotel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create hotel. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-slate-900">Create Your Hotel</h1>
        <p className="text-slate-600">Fill in the details to list your property</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= step ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {step}
            </div>
            {step < 4 && <div className="w-12 h-1 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Tell us about your hotel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hotel Name */}
            <div className="space-y-2">
              <Label>Hotel Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Grand Ocean Resort"
                className="h-12"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your hotel..."
                rows={4}
              />
            </div>

            {/* Hotel Type and Star Rating */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hotel Type</Label>
                <Select
                  value={formData.hotelType}
                  onValueChange={(value) => handleInputChange('hotelType', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resort">Resort</SelectItem>
                    <SelectItem value="boutique">Boutique</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Star Rating</Label>
                <Select
                  value={formData.starRating.toString()}
                  onValueChange={(value) => handleInputChange('starRating', parseInt(value))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} Star{rating > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Street address"
                className="h-12"
              />
            </div>

            {/* City, State, Country */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>State/Province</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Country"
                  className="h-12"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@hotel.com"
                  className="h-12"
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yourhotel.com"
                className="h-12"
              />
            </div>

            {/* Main Image Upload */}
            <div className="space-y-2">
              <Label>Main Hotel Image</Label>
              {!mainImagePreview ? (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMainImageUpload}
                  />
                  <div className="p-8 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-teal-600 transition-colors flex flex-col items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-teal-600" />
                    <span className="text-sm font-bold text-teal-600">Upload Main Image</span>
                  </div>
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={mainImagePreview}
                    alt="Main preview"
                    className="w-full h-64 object-cover rounded-2xl"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, mainImage: null }));
                      setMainImagePreview("");
                    }}
                    className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Additional Images */}
            <div className="space-y-2">
              <Label>Additional Images</Label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAdditionalImagesUpload}
                />
                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-teal-600 transition-colors flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5 text-teal-600" />
                  <span className="text-xs font-bold text-teal-600">
                    Upload More Images ({additionalImagePreviews.length})
                  </span>
                </div>
              </label>

              {additionalImagePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {additionalImagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAdditionalImage(index)}
                        className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className="w-full h-12 bg-teal-600 hover:bg-teal-700"
            >
              Continue to Rooms & Amenities
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Rooms & Amenities */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Rooms & Amenities</CardTitle>
            <CardDescription>Add your room types and hotel amenities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Rooms Section */}
            <div className="space-y-4">
              <Label className="text-lg font-bold">Rooms</Label>
              {rooms.map((room, index) => (
                <div key={room.id} className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black uppercase text-teal-600">Room {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoom(room.id)}
                      className="h-8 w-8 p-0 rounded-full hover:bg-red-100"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Room Name *</Label>
                      <Input
                        value={room.name}
                        onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                        placeholder="e.g., Deluxe Ocean View"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Room Type</Label>
                      <Select
                        value={room.roomType}
                        onValueChange={(value) => updateRoom(room.id, 'roomType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="double">Double</SelectItem>
                          <SelectItem value="suite">Suite</SelectItem>
                          <SelectItem value="presidential">Presidential</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={room.description}
                      onChange={(e) => updateRoom(room.id, 'description', e.target.value)}
                      placeholder="Describe this room..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Max Occupancy</Label>
                      <Input
                        type="number"
                        value={room.maxOccupancy}
                        onChange={(e) => updateRoom(room.id, 'maxOccupancy', parseInt(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Beds</Label>
                      <Input
                        type="number"
                        value={room.numBeds}
                        onChange={(e) => updateRoom(room.id, 'numBeds', parseInt(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bed Type</Label>
                      <Select
                        value={room.bedType}
                        onValueChange={(value) => updateRoom(room.id, 'bedType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="twin">Twin</SelectItem>
                          <SelectItem value="queen">Queen</SelectItem>
                          <SelectItem value="king">King</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Base Price (per night) *</Label>
                      <Input
                        type="number"
                        value={room.basePrice}
                        onChange={(e) => updateRoom(room.id, 'basePrice', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Room Size (sqm)</Label>
                      <Input
                        type="number"
                        value={room.roomSize}
                        onChange={(e) => updateRoom(room.id, 'roomSize', e.target.value)}
                        placeholder="25"
                        step="0.1"
                      />
                    </div>
                  </div>

                  {/* Room Images */}
                  <div className="space-y-2">
                    <Label>Room Images * (Required)</Label>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleRoomImageUpload(room.id, e.target.files)}
                      />
                      <div className="p-4 rounded-xl border-2 border-dashed border-teal-300 bg-white cursor-pointer hover:border-teal-600 transition-colors flex items-center justify-center gap-2">
                        <Upload className="h-5 w-5 text-teal-600" />
                        <span className="text-xs font-bold text-teal-600">
                          Upload Room Images ({room.tempImages.length})
                        </span>
                      </div>
                    </label>

                    {room.tempImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {room.tempImages.map((file, imgIndex) => (
                          <div key={imgIndex} className="relative aspect-square rounded-lg overflow-hidden">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Room preview ${imgIndex + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <Button
                onClick={addRoom}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700"
              >
                Add Room Type
              </Button>
            </div>

            {/* Amenities Section */}
            <div className="space-y-4">
              <Label className="text-lg font-bold">Hotel Amenities (Optional)</Label>
              {amenities.map((amenity, index) => (
                <div key={amenity.id} className="flex items-center gap-4">
                  <Input
                    value={amenity.name}
                    onChange={(e) => updateAmenity(amenity.id, 'name', e.target.value)}
                    placeholder="e.g., Free WiFi"
                    className="flex-1"
                  />
                  <Select
                    value={amenity.category}
                    onValueChange={(value) => updateAmenity(amenity.id, 'category', value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="bathroom">Bathroom</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAmenity(amenity.id)}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}

              <Button
                onClick={addAmenity}
                variant="outline"
                className="w-full"
              >
                Add Amenity
              </Button>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1 h-12"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  if (validateStep2()) setCurrentStep(3);
                }}
                className="flex-1 h-12 bg-teal-600 hover:bg-teal-700"
              >
                Continue to Facilities
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Facilities & Activities */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Facilities & Activities</CardTitle>
            <CardDescription>Add facilities and activities offered at your hotel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Facilities */}
            <DynamicItemListWithImages
              items={facilities}
              onChange={setFacilities}
              label="Facilities"
              showPrice={true}
              showBookingLink={true}
              showCapacity={true}
              requireImages={true}
              defaultPriceType="paid"
              accentColor="#008080"
              maxImages={3}
            />

            {/* Activities */}
            <DynamicItemListWithImages
              items={activities}
              onChange={setActivities}
              label="Activities"
              showPrice={true}
              showBookingLink={true}
              requireImages={true}
              defaultPriceType="paid"
              accentColor="#008080"
              maxImages={3}
            />

            <div className="flex gap-4">
              <Button
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="flex-1 h-12"
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                className="flex-1 h-12 bg-teal-600 hover:bg-teal-700"
              >
                Continue to Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Review & Submit */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Review your hotel information before submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">Hotel Information</h3>
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Type:</strong> {formData.hotelType}</p>
                <p><strong>Location:</strong> {formData.city}, {formData.country}</p>
                <p><strong>Rating:</strong> {formData.starRating} Stars</p>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Rooms</h3>
                <p>{rooms.length} room type(s) added</p>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Amenities</h3>
                <p>{amenities.filter(a => a.name).length} amenity/amenities added</p>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Facilities</h3>
                <p>{facilities.filter(f => f.name).length} facility/facilities added</p>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">Activities</h3>
                <p>{activities.filter(a => a.name).length} activity/activities added</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setCurrentStep(3)}
                variant="outline"
                className="flex-1 h-12"
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 h-12 bg-teal-600 hover:bg-teal-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Hotel...
                  </>
                ) : (
                  'Create Hotel'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateHotelForm;