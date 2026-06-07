import { useEffect, useState } from "react";
import { formatDisplayDate, parseDisplayDate } from "../dateFormat";

export default function DateField({ ariaLabel, onChange, value }) {
  const [displayValue, setDisplayValue] = useState(() => formatDisplayDate(value));

  useEffect(() => {
    setDisplayValue(formatDisplayDate(value));
  }, [value]);

  function commitDate(nextDisplayValue) {
    const trimmedValue = nextDisplayValue.trim();
    if (!trimmedValue) {
      onChange("");
      return;
    }

    const parsedValue = parseDisplayDate(trimmedValue);
    if (parsedValue) {
      onChange(parsedValue);
      setDisplayValue(formatDisplayDate(parsedValue));
    } else {
      setDisplayValue(formatDisplayDate(value));
    }
  }

  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      onBlur={(event) => commitDate(event.target.value)}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDisplayValue(nextValue);
        const parsedValue = parseDisplayDate(nextValue);
        if (parsedValue) onChange(parsedValue);
        if (!nextValue.trim()) onChange("");
      }}
      placeholder="DD/MM/YYYY"
      type="text"
      value={displayValue}
    />
  );
}
