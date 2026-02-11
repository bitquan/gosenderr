
import { PackageSize, PackageFlags } from '@/lib/v2/types';

interface PackageDetailsFormProps {
  size: PackageSize | null;
  flags: PackageFlags;
  notes: string;
  onSizeChange: (size: PackageSize) => void;
  onFlagsChange: (flags: PackageFlags) => void;
  onNotesChange: (notes: string) => void;
  theme?: "light" | "dark";
}

const PACKAGE_SIZE_OPTIONS: { value: PackageSize; label: string; description: string }[] = [
  { value: 'small', label: 'Small', description: 'Shoebox, small package (up to 1 ft³)' },
  { value: 'medium', label: 'Medium', description: 'Backpack, medium box (1-3 ft³)' },
  { value: 'large', label: 'Large', description: 'Suitcase, large box (3-10 ft³)' },
  { value: 'xl', label: 'Extra Large', description: 'Furniture piece, appliance (10+ ft³)' },
];

export function PackageDetailsForm({
  size,
  flags,
  notes,
  onSizeChange,
  onFlagsChange,
  onNotesChange,
  theme = "light",
}: PackageDetailsFormProps) {
  const isDark = theme === "dark";
  
  const handleFlagToggle = (flag: keyof PackageFlags) => {
    onFlagsChange({
      ...flags,
      [flag]: !flags[flag],
    });
  };

  return (
    <div
      style={{
        padding: "20px",
        background: isDark ? "rgba(15, 23, 42, 0.55)" : "white",
        borderRadius: "12px",
        border: isDark ? "1px solid rgba(196, 181, 253, 0.45)" : "1px solid #ddd",
        color: isDark ? "#f8fafc" : "#111827",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Package Details</h3>

      {/* Package Size */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
          Package Size <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <div style={{ display: 'grid', gap: '8px' }}>
          {PACKAGE_SIZE_OPTIONS.map((option) => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${
                  size === option.value
                    ? "#6E56CF"
                    : isDark
                      ? "rgba(196, 181, 253, 0.4)"
                      : "#ddd"
                }`,
                borderRadius: '6px',
                cursor: 'pointer',
                background: size === option.value
                  ? isDark
                    ? "rgba(109, 40, 217, 0.35)"
                    : "#f0f0ff"
                  : isDark
                    ? "rgba(30, 41, 59, 0.65)"
                    : "white",
                transition: 'all 0.2s',
              }}
            >
              <input
                type="radio"
                name="packageSize"
                value={option.value}
                checked={size === option.value}
                onChange={() => onSizeChange(option.value)}
                style={{ marginRight: '12px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>{option.label}</div>
                <div style={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#666' }}>{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Handling Flags */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
          Special Handling (optional)
        </label>
        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flags.needsSuvVan || false}
              onChange={() => handleFlagToggle('needsSuvVan')}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span>🚐 Needs SUV/Van</span>
            {flags.needsSuvVan && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: isDark ? '#fde68a' : '#856404', background: isDark ? 'rgba(120, 53, 15, 0.45)' : '#fef9e7', padding: '2px 6px', borderRadius: '4px' }}>
                May affect price
              </span>
            )}
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flags.fragile || false}
              onChange={() => handleFlagToggle('fragile')}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span>📦 Fragile</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flags.heavyTwoPerson || false}
              onChange={() => handleFlagToggle('heavyTwoPerson')}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span>💪 Heavy (2-person lift required)</span>
            {flags.heavyTwoPerson && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: isDark ? '#fde68a' : '#856404', background: isDark ? 'rgba(120, 53, 15, 0.45)' : '#fef9e7', padding: '2px 6px', borderRadius: '4px' }}>
                May affect price
              </span>
            )}
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flags.oversized || false}
              onChange={() => handleFlagToggle('oversized')}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span>📏 Oversized / awkward shape</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flags.stairs || false}
              onChange={() => handleFlagToggle('stairs')}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            <span>🪜 Stairs involved</span>
          </label>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
          Notes for Courier (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value.slice(0, 300))}
          placeholder="Any special instructions or details about the package..."
          maxLength={300}
          rows={3}
          style={{
            width: '100%',
            padding: '10px',
            border: isDark ? '1px solid rgba(196, 181, 253, 0.45)' : '1px solid #ddd',
            background: isDark ? 'rgba(15, 23, 42, 0.55)' : '#fff',
            color: isDark ? '#f8fafc' : '#111827',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#666', marginTop: '4px', textAlign: 'right' }}>
          {notes.length}/300 characters
        </div>
      </div>
    </div>
  );
}
