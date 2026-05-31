export const highlightColors = ["#fff0b3", "#dcfff1", "#e9f2ff", "#f3f0ff", "#ffebe6", "#f7d6c4"];

const allowedTags = new Set(["B", "BR", "DIV", "EM", "I", "MARK", "P", "SPAN", "STRONG", "U"]);

function normalizeColor(color) {
  if (typeof document === "undefined") return color;

  const element = document.createElement("span");
  element.style.backgroundColor = color;
  return element.style.backgroundColor;
}

const allowedHighlightColors = new Set(highlightColors.map(normalizeColor));

export function sanitizeRichText(value = "") {
  if (typeof document === "undefined") return value;

  const template = document.createElement("template");
  template.innerHTML = value;

  function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    [...node.childNodes].forEach(sanitizeNode);

    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    const backgroundColor = normalizeColor(node.style.backgroundColor);
    [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name));

    if ((node.tagName === "MARK" || node.tagName === "SPAN") && allowedHighlightColors.has(backgroundColor)) {
      node.style.backgroundColor = backgroundColor;
    }
  }

  [...template.content.childNodes].forEach(sanitizeNode);
  return template.innerHTML;
}

export function stripRichText(value = "") {
  if (typeof document === "undefined") return value.replace(/<[^>]*>/g, " ");

  const element = document.createElement("div");
  element.innerHTML = sanitizeRichText(value);
  return element.textContent || "";
}
