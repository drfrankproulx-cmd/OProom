import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

/**
 * Masked date input with US-format display (MM/DD/YYYY) + smart auto-advance.
 *
 * Behaviour:
 *  - User types digits only — separators are auto-inserted
 *  - Typing `5` as the first month digit → auto-pads to `05/` so user goes straight to day
 *  - Typing `8` after `05/` → auto-pads to `05/08/`
 *  - Backspace removes one digit at a time, separators removed automatically
 *  - Calendar icon button reveals a hidden native picker for users who prefer clicking
 *  - Emits ISO `yyyy-mm-dd` (or empty string) via onChange so backend payloads are unchanged
 */
const isoToDigits = (iso) => {
  if (!iso || typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  return m[2] + m[3] + m[1]; // MMDDYYYY
};

const formatDisplay = (digits) => {
  if (!digits) return '';
  const m = digits.slice(0, 2);
  const d = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  let out = m;
  if (digits.length >= 2) out += '/';
  out += d;
  if (digits.length >= 4) out += '/';
  out += y;
  return out;
};

const DateInputMDY = ({
  value = '',
  onChange,
  onBlur,
  min,
  max,
  className = '',
  placeholder = 'MM/DD/YYYY',
  ...rest
}) => {
  const [digits, setDigits] = useState(isoToDigits(value));
  const nativeRef = useRef(null);

  // Keep internal state in sync with parent
  useEffect(() => {
    setDigits(isoToDigits(value));
  }, [value]);

  const emit = (newDigits) => {
    if (newDigits.length === 8) {
      const iso = `${newDigits.slice(4, 8)}-${newDigits.slice(0, 2)}-${newDigits.slice(2, 4)}`;
      onChange && onChange(iso);
    } else if (newDigits.length === 0) {
      onChange && onChange('');
    }
  };

  const handleKeyDown = (e) => {
    // Let modifier shortcuts work
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab' || e.key === 'Enter') return;

    e.preventDefault();

    if (e.key === 'Backspace') {
      setDigits((d) => {
        const next = d.slice(0, -1);
        emit(next);
        return next;
      });
      return;
    }

    if (e.key === 'Delete') {
      setDigits((d) => { emit(''); return ''; });
      return;
    }

    if (!/^\d$/.test(e.key)) return;
    const k = e.key;

    setDigits((d) => {
      if (d.length >= 8) return d;
      let next;
      // Auto-pad single-digit month: typing 2-9 as first digit jumps straight to day
      if (d.length === 0 && parseInt(k, 10) >= 2) {
        next = '0' + k;
      }
      // Reject impossible month start "1" then >2 (no month >= 13)
      else if (d.length === 1 && d === '1' && parseInt(k, 10) > 2) {
        next = '01' + k;
        // Continue with day-pad logic — first day digit
        if (parseInt(k, 10) >= 4) {
          next = '01' + '0' + k;
        }
      }
      // Auto-pad single-digit day: typing 4-9 as first day digit jumps straight to year
      else if (d.length === 2 && parseInt(k, 10) >= 4) {
        next = d + '0' + k;
      }
      // Reject impossible day start "3" then >1 (no day >= 32)
      else if (d.length === 3 && d[2] === '3' && parseInt(k, 10) > 1) {
        // Treat the "3" as single-digit day "03" and start fresh
        next = d.slice(0, 2) + '03' + k;
      }
      else {
        next = d + k;
      }
      next = next.slice(0, 8);
      emit(next);
      return next;
    });
  };

  // Paste support — extract digits
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const onlyDigits = pasted.replace(/\D/g, '').slice(0, 8);
    setDigits(onlyDigits);
    emit(onlyDigits);
  };

  const getCurrentIso = (d) => {
    if (d.length === 8) {
      return `${d.slice(4, 8)}-${d.slice(0, 2)}-${d.slice(2, 4)}`;
    }
    return '';
  };

  const handleBlurInternal = (e) => {
    // Pass the current ISO directly so callers don't have to rely on
    // potentially stale React state from the parent's last render.
    if (onBlur) onBlur(getCurrentIso(digits), e);
  };

  // Calendar icon → open native picker for those who prefer click
  const handleCalendarClick = () => {
    if (nativeRef.current?.showPicker) {
      nativeRef.current.showPicker();
    } else {
      nativeRef.current?.click();
    }
  };

  const handleNativeChange = (e) => {
    const iso = e.target.value;
    setDigits(isoToDigits(iso));
    onChange && onChange(iso);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatDisplay(digits)}
        onChange={() => { /* controlled by keyDown/paste */ }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlurInternal}
        placeholder={placeholder}
        className="w-full pr-7 px-2 h-9 rounded-md border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:border-teal-400 placeholder:text-slate-300"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={handleCalendarClick}
        className="absolute right-1.5 p-0.5 text-slate-400 hover:text-teal-500 transition-colors"
        aria-label="Open date picker"
      >
        <CalendarIcon className="h-3.5 w-3.5" />
      </button>
      <input
        ref={nativeRef}
        type="date"
        value={value || ''}
        min={min}
        max={max}
        onChange={handleNativeChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};

export default DateInputMDY;
