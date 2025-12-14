import WhatsAppWidget from '@/components/whatsapp/WhatsAppWidget';
import CartDrawer from '@/components/cart/CartDrawer';
import CartAnimationProvider from '@/components/cart/CartAnimationProvider';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartAnimationProvider>
      {children}
      <WhatsAppWidget />
      <CartDrawer />
    </CartAnimationProvider>
  );
}

