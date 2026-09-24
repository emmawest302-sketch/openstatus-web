/**
 * Where a Menu row actually goes.
 *
 * A menu used to be configured three ways — a link, an uploaded PDF, or a
 * link to a photo album — and the published row read `url` only. An owner who
 * uploaded a PDF got a row that looked tappable and did nothing, and the
 * customer blamed the restaurant rather than us.
 *
 * The builder offers one way now: a link. This still resolves the old shapes,
 * because pages configured before that change are live and their PDFs have to
 * keep opening. A pasted link always wins over a leftover upload — that is how
 * an owner replaces one without a delete button.
 */

import { externalUrl } from './url';

export type MenuSource = {
  url?: string;
  menuFile?: string;
  menuType?: string;
};

export type MenuDestination = { href: string; kind: 'pdf' | 'link' };

export function menuDestination(block: MenuSource): MenuDestination | null {
  // "mymenu.com" typed without a scheme is a relative path in an href, which
  // lands the customer on the business's own page instead of the menu.
  const url = externalUrl(block.url);
  if (url) return { href: url, kind: 'link' };

  const file = block.menuFile?.trim() ?? '';
  if (file) return { href: file, kind: 'pdf' };

  return null;
}
