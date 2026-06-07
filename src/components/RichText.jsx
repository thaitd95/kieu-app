import { useEffect, useRef } from "react";
import { highlightColors, sanitizeRichText } from "../richText";

export function RichTextEditor({ minHeight = 110, onChange, placeholder, value }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current !== document.activeElement) {
      editorRef.current.innerHTML = sanitizeRichText(value);
    }
  }, [value]);

  function emitChange() {
    onChange(sanitizeRichText(editorRef.current?.innerHTML || ""));
  }

  function applyCommand(command, commandValue) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function applyLink() {
    const rawHref = window.prompt("Nhap hyperlink");
    if (rawHref === null) return;

    const href = rawHref.trim();
    if (!href) {
      applyCommand("unlink");
      return;
    }

    const normalizedHref = /^[a-z][a-z\d+.-]*:/i.test(href) ? href : `https://${href}`;
    applyCommand("createLink", normalizedHref);
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        <button aria-label="In đậm" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("bold")} title="In đậm" type="button"><strong>B</strong></button>
        <button aria-label="In nghiêng" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("italic")} title="In nghiêng" type="button"><em>I</em></button>
        <button aria-label="Gạch dưới" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("underline")} title="Gạch dưới" type="button"><u>U</u></button>
        <button aria-label="Chen hyperlink" className="rich-text-link-button" onMouseDown={(event) => event.preventDefault()} onClick={applyLink} title="Chen hyperlink" type="button">Link</button>
        <span className="rich-text-toolbar-label">Highlight</span>
        {highlightColors.map((color) => (
          <button
            aria-label={`Highlight ${color}`}
            className="rich-text-highlight"
            key={color}
            onClick={() => applyCommand("hiliteColor", color)}
            onMouseDown={(event) => event.preventDefault()}
            style={{ backgroundColor: color }}
            title={`Highlight ${color}`}
            type="button"
          />
        ))}
      </div>
      <div
        className="rich-text-input"
        contentEditable
        data-placeholder={placeholder}
        onBlur={emitChange}
        onInput={emitChange}
        ref={editorRef}
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
}

export function RichTextContent({ className = "", fallback = "", value }) {
  if (!value) return fallback;

  return <div className={`rich-text-content ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
}
