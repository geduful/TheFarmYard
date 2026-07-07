'use client';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

const GHANA_CODE = '+233';
const GHANA_LOCAL_LENGTH = 9; // e.g. 244123456

export default function PhoneInput({ value, onChange, required, placeholder }: PhoneInputProps) {
  // Derive the local part from the stored full value
  const localNumber = value.startsWith(GHANA_CODE)
    ? value.slice(GHANA_CODE.length)
    : value;

  function handleChange(val: string) {
    // Strip non-digits and leading zeros
    const digits = val.replace(/\D/g, '').replace(/^0+/, '');
    // Enforce max length
    const trimmed = digits.slice(0, GHANA_LOCAL_LENGTH);
    onChange(`${GHANA_CODE}${trimmed}`);
  }

  return (
    <div className="flex">
      {/* Fixed country code badge */}
      <span className="flex items-center px-3.5 py-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-sm font-medium text-gray-600 select-none whitespace-nowrap">
        🇬🇭 +233
      </span>

      {/* Local number input */}
      <input
        type="tel"
        value={localNumber}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || '244 123 456'}
        required={required}
        maxLength={GHANA_LOCAL_LENGTH}
        className="flex-1 min-w-0 px-3.5 py-3 border border-gray-200 rounded-r-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-farm-green/30 focus:border-farm-green transition-all shadow-sm"
      />
    </div>
  );
}
