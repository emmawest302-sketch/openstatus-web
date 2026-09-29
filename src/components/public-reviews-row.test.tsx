import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PublicReviewsRow from './public-reviews-row';
import type { OpenStatusBlock } from '@/lib/openstatus-page-config';

vi.mock('@/components/analytics-tracker', () => ({ trackOpenStatusEvent: vi.fn() }));

const reviewBlock = (googleUrl?: string): OpenStatusBlock => ({
  id: 'reviews', title: 'Reviews', sub: '', icon: 'star', on: true,
  tone: 'default', googleUrl,
});

describe('Reviews row without loaded Google reviews', () => {
  it('still renders a valid saved review link', () => {
    const html = renderToStaticMarkup(
      <PublicReviewsRow block={reviewBlock('https://maps.google.com/example')} businessId="biz"/>
    );
    expect(html).toContain('href="https://maps.google.com/example"');
    expect(html).toContain('Reviews');
  });

  it('keeps an empty row off the customer page', () => {
    const html = renderToStaticMarkup(<PublicReviewsRow block={reviewBlock()} businessId="biz"/>);
    expect(html).toBe('');
  });
});
