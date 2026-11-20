const allowedStyles = ['color', 'font-size', 'font-weight'];

// Put font sizes on text leaves so an obsolete outer span cannot enlarge line boxes.
export function flattenFontSizes(root: HTMLElement | DocumentFragment) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const runs: { node: Text; size: string }[] = [];
  let node = walker.nextNode();
  while (node) {
    let parent = node.parentElement;
    let size = '';
    while (parent && parent !== root) {
      if (parent.style.fontSize) {
        size = parent.style.fontSize;
        break;
      }
      parent = parent.parentElement;
    }
    if (size && node.textContent) runs.push({ node: node as Text, size });
    node = walker.nextNode();
  }
  root.querySelectorAll<HTMLElement>('[style]').forEach((element) => {
    element.style.removeProperty('font-size');
    if (!element.style.length) element.removeAttribute('style');
  });
  runs.forEach(({ node: text, size }) => {
    const span = document.createElement('span');
    span.style.fontSize = size;
    text.replaceWith(span);
    span.append(text);
  });
  [...root.querySelectorAll('span')].reverse().forEach((span) => {
    if (!span.attributes.length) span.replaceWith(...span.childNodes);
  });
  root.normalize();
}

export function getRichTextPlainText(html: string) {
  const element = document.createElement('template');

  element.innerHTML = html;

  return (element.content.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

export function isBlankRichText(html: string) {
  return getRichTextPlainText(html).length === 0;
}

export function normalizeRichText(html: string) {
  const template = document.createElement('template');

  template.innerHTML = html;
  template.content.querySelectorAll('script, style, img, table, iframe, object, embed, svg, math, form, input, button, textarea, select, link, meta, template, audio, video, source').forEach((node) => node.remove());
  const allowedTags = new Set(['P', 'DIV', 'BR', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE']);
  template.content.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (!allowedTags.has(node.tagName)) { node.replaceWith(...node.childNodes); return; }
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

  flattenFontSizes(template.content);
  return template.innerHTML;
}

export function insertPlainText(event: ClipboardEvent) {
  event.preventDefault();

  const text = event.clipboardData?.getData('text/plain') ?? '';

  document.execCommand('insertText', false, text);
}

