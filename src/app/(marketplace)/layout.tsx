import WhatsAppWidget from '@/components/whatsapp/WhatsAppWidget';
import CartDrawer from '@/components/cart/CartDrawer';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <WhatsAppWidget />
      <CartDrawer />
    </>
  );
}

