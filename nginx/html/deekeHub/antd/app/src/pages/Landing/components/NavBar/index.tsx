import { useState, useEffect } from 'react';
import { useModel, Link } from 'umi';
import styles from './index.module.less';

const NavBar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { initialState } = useModel('@@initialState');
  const isLoggedIn = !!initialState?.currentUser;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/logo.png" alt="DeekeHub" className={styles.logoImg} />
          <span>DeekeHub</span>
        </Link>

        <div className={`${styles.links} ${mobileOpen ? styles.mobileOpen : ''}`}>
          <button className={styles.link} onClick={() => scrollTo('features')}>功能</button>
          <button className={styles.link} onClick={() => scrollTo('demo')}>在线演示</button>
          <button className={styles.link} onClick={() => scrollTo('how-it-works')}>产品</button>
          <button className={styles.link} onClick={() => scrollTo('value')}>优势</button>
          <button className={styles.link} onClick={() => scrollTo('cta')}>价格</button>

          <div className={styles.actions}>
            {isLoggedIn ? (
              <Link to="/welcome" className={styles.btnPrimary}>进入控制台</Link>
            ) : (
              <>
                <Link to="/user/login" className={styles.btnOutline}>登录</Link>
                <Link to="/user/login" className={styles.btnPrimary}>免费试用</Link>
              </>
            )}
          </div>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
