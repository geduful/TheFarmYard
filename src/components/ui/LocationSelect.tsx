'use client';

import {
  GHANA_REGIONS,
  getDistricts,
  getTowns,
  parseLocation,
  formatLocation,
} from '@/lib/locations';

interface LocationSelectProps {
  value: string;
  onChange: (location: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export function LocationSelect({
  value,
  onChange,
  disabled = false,
  label = 'Location',
  required = false,
}: LocationSelectProps) {
  const parsed = parseLocation(value);
  const region = parsed?.region || '';
  const district = parsed?.district || '';
  const town = parsed?.town || '';

  const districts = region ? getDistricts(region) : [];
  const towns = region && district ? getTowns(region, district) : [];

  function handleRegionChange(newRegion: string) {
    if (newRegion) {
      onChange(newRegion);
    } else {
      onChange('');
    }
  }

  function handleDistrictChange(newDistrict: string) {
    if (newDistrict) {
      onChange(formatLocation(region, newDistrict, ''));
    } else {
      onChange(region);
    }
  }

  function handleTownChange(newTown: string) {
    if (newTown) {
      onChange(formatLocation(region, district, newTown));
    } else {
      onChange(formatLocation(region, district, ''));
    }
  }

  const selectClass = `w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-farm-green/20 focus:border-farm-green shadow-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => handleRegionChange(e.target.value)}
            disabled={disabled}
            className={selectClass}
          >
            <option value="">Select Region</option>
            {GHANA_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">District / Municipal</label>
          <select
            value={district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={disabled || !region}
            className={selectClass}
          >
            <option value="">{region ? 'Select District' : 'Select Region first'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Town / City</label>
          <select
            value={town}
            onChange={(e) => handleTownChange(e.target.value)}
            disabled={disabled || !district}
            className={selectClass}
          >
            <option value="">{district ? 'Select Town' : 'Select District first'}</option>
            {towns.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
