const allowedStyles = ['color', 'font-size', 'font-weight'];

export function getRichTextPlainText(html: string) {
  const element = document.createElement('div');

  element.innerHTML = html;

  return (element.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

export function isBlankRichText(html: string) {
  return getRichTextPlainText(html).length === 0;
}

export function normalizeRichText(html: string) {
  const template = document.createElement('template');

  template.innerHTML = html;
  template.content.querySelectorAll('script, style, img, table, iframe').forEach((node) => node.remove());
  template.content.querySelectorAll<HTMLElement>('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name !== 'style') {
        node.removeAttribute(attribute.name);
      }
    });

    const nextStyle = allowedStyles
      .map((name) => {
        const value = node.style.getPropertyValue(name);

        return value ? `${name}: ${value}` : '';
      })
      .filter(Boolean)
      .join('; ');

    if (nextStyle) {
      node.setAttribute('style', nextStyle);
    } else {
      node.removeAttribute('style');
    }
  });

  return template.innerHTML;
}

export function insertPlainText(event: ClipboardEvent) {
  event.preventDefault();

  const text = event.clipboardData?.getData('text/plain') ?? '';

  document.execCommand('insertText', false, text);
}

