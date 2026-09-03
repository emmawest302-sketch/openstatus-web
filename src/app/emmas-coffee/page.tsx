import type { Metadata } from 'next';
import EmmasCoffeeDemo from '@/components/emmas-coffee-demo';

export const metadata: Metadata = {
  title: "Emma's Coffee · OpenStatus Demo",
  description: 'A fictional business showing the real OpenStatus customer experience.',
};

export default function EmmasCoffeePage() {
  return <EmmasCoffeeDemo />;
}
