import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Common";

export default function SelectDropdown({
  ariaLabel,
  className = "",
  disabled = false,
  onChange,
  options,
  placeholder = "Chọn giá trị",
  style,
  value,
}) {
  const listboxId = useId();
  const closeTimerRef = useRef(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, minWidth: 180, top: 0 });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    function updatePosition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const minWidth = Math.max(rect.width, 180);
      const estimatedHeight = Math.min(options.length * 35 + 10, 280);
      const opensAbove =
        window.innerHeight - rect.bottom < estimatedHeight + 12 &&
        rect.top > estimatedHeight + 12;

      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - minWidth - 8)),
        minWidth,
        top: opensAbove ? rect.top - estimatedHeight - 6 : rect.bottom + 6,
      });
    }

    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        closeDropdown();
      }
    }

    updatePosition();
    document.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, options.length]);

  function openDropdown() {
    if (disabled) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsClosing(false);
    setIsOpen(true);
  }

  function closeDropdown() {
    if (!isOpen || isClosing) return;

    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 120);
  }

  function chooseOption(option) {
    onChange(option.value);
    closeDropdown();
  }

  function handleKeyDown(event) {
    if (disabled) return;

    if (event.key === "Escape") {
      closeDropdown();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }

      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + direction + options.length) % options.length);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else if (options[activeIndex]) {
        chooseOption(options[activeIndex]);
      }
    }
  }

  return (
    <div
      className={`custom-select ${isOpen && !isClosing ? "open" : ""} ${disabled ? "disabled" : ""} ${className}`}
      ref={rootRef}
      style={style}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="custom-select-trigger"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) closeDropdown();
          else openDropdown();
        }}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <span className="custom-select-value">
          {selectedOption?.color && (
            <i className="custom-select-dot" style={{ backgroundColor: selectedOption.color }} />
          )}
          <span>{selectedOption?.label || placeholder}</span>
        </span>
        <Icon className="custom-select-chevron" name="down" size={13} />
      </button>
      {isOpen &&
        createPortal(
          <div
            className={`custom-select-menu ${isClosing ? "closing" : ""}`}
            id={listboxId}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleKeyDown}
            ref={menuRef}
            role="listbox"
            style={position}
          >
            {options.map((option, index) => (
              <button
                aria-selected={option.value === value}
                className={`custom-select-option ${index === activeIndex ? "active" : ""} ${option.value === value ? "selected" : ""}`}
                key={option.value}
                onClick={() => chooseOption(option)}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span>
                  {option.color && (
                    <i className="custom-select-dot" style={{ backgroundColor: option.color }} />
                  )}
                  <span>{option.label}</span>
                </span>
                {option.value === value && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
