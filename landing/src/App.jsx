import Cursor          from './components/Cursor';
import Navbar          from './components/Navbar';
import Hero            from './components/Hero';
import Marquee         from './components/Marquee';
import Features        from './components/Features';
import GroupSection    from './components/GroupSection';
import PersonalSection from './components/PersonalSection';
import BalanceSection  from './components/BalanceSection';
import DashboardSection from './components/DashboardSection';
import AlgoSection     from './components/AlgoSection';
import HowItWorks      from './components/HowItWorks';
import Roadmap         from './components/Roadmap';
import CTA             from './components/CTA';
import Footer          from './components/Footer';

export default function App() {
  return (
    <>
      <Cursor />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <GroupSection />
        <PersonalSection />
        <BalanceSection />
        <DashboardSection />
        <AlgoSection />
        <HowItWorks />
        <Roadmap />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
