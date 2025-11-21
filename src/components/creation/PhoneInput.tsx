import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_PHONE_CODES } from "@/lib/countryHelpers";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  country?: string;
  placeholder?: string;
}

export const PhoneInput = ({ value, onChange, country, placeholder = "Enter phone number" }: PhoneInputProps) => {
  const countryCode = country ? COUNTRY_PHONE_CODES[country] || "+254" : "+254";
  const [selectedCode, setSelectedCode] = useState(countryCode);
  
  // Extract phone number without code
  const phoneNumber = value.replace(selectedCode, "").replace(/^0+/, "");
  
  const handlePhoneChange = (phoneValue: string) => {
    // Remove leading zeros and non-digits
    const cleanPhone = phoneValue.replace(/^0+/, "").replace(/\D/g, "");
    onChange(`${selectedCode}${cleanPhone}`);
  };
  
  const handleCodeChange = (code: string) => {
    setSelectedCode(code);
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    onChange(`${code}${cleanPhone}`);
  };

  return (
    <div className="flex gap-2">
      <Select value={selectedCode} onValueChange={handleCodeChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(COUNTRY_PHONE_CODES).map(([country, code]) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={(e) => handlePhoneChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  );
};

import { useState } from "react";