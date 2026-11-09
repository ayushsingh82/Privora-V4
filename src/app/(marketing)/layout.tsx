import MarketingNav from "@/components/MarketingNav";
import Footer from "@/components/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black text-white">
      <MarketingNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
