import { useEffect, useRef, useState, useCallback } from 'react';
import NavBar from './components/NavBar';
import Hero from './components/Hero';
import ValueProposition from './components/ValueProposition';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import VideoDemo from './components/VideoDemo';
import CTA from './components/CTA';
import Footer from './components/Footer';
import BackToTop from './components/BackToTop';
import styles from './index.module.less';

function useInView(threshold = 0.12): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

interface SectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ id, className, children }) => {
  const [ref, inView] = useInView();
  return (
    <section
      id={id}
      ref={ref}
      className={`${styles.section} ${inView ? styles.visible : ''} ${className || ''}`}
    >
      {children}
    </section>
  );
};

const Landing: React.FC = () => {
  return (
    <div className={styles.landing}>
      <NavBar />
      <Hero />
      <Section id="demo">
        <VideoDemo />
      </Section>
      <Section id="value">
        <ValueProposition />
      </Section>
      <Section id="features">
        <Features />
      </Section>
      <Section id="how-it-works">
        <HowItWorks />
      </Section>
      <Section id="cta">
        <CTA />
      </Section>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Landing;
