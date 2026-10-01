import { displayFont } from "@/lib/fonts";
import Header from "@/components/marketing/Header";
import ScrollProgress from "@/components/marketing/ScrollProgress";
import ScrollActions from "@/components/marketing/ScrollActions";
import Hero from "@/components/marketing/Hero";
import Services from "@/components/marketing/Services";
import HowItWorks from "@/components/marketing/HowItWorks";
import Coverage from "@/components/marketing/Coverage";
import WhyUs from "@/components/marketing/WhyUs";
import Faq from "@/components/marketing/Faq";
import CtaBanner from "@/components/marketing/CtaBanner";
import Footer from "@/components/marketing/Footer";

/** Public marketing homepage — distinct from the /login and /dashboard portal. */
export default function HomePage() {
  return (
    <div className={displayFont.variable}>
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Coverage />
        <WhyUs />
        <Faq />
        <CtaBanner />
      </main>
      <Footer />
      <ScrollActions />
    </div>
  );
}
