import { Link } from 'umi';
import styles from './index.module.less';

const Hero: React.FC = () => {
  const goToRegister = () => {
    window.location.href = '/user/login?action=register';
  };

  return (
    <section className={styles.hero}>
      <div className={styles.gridBg} />
      <div className={styles.gridDots}>
        <span className={`${styles.dot} ${styles.dotLg} ${styles.dot1}`} />
        <span className={`${styles.dot} ${styles.dotSm} ${styles.dot2}`} />
        <span className={`${styles.dot} ${styles.dotXl} ${styles.dot3}`} />
        <span className={`${styles.dot} ${styles.dotSm} ${styles.dot4}`} />
        <span className={`${styles.dot} ${styles.dotMd} ${styles.dot5}`} />
        <span className={`${styles.dot} ${styles.dotLg} ${styles.dot6}`} />
        <span className={`${styles.dot} ${styles.dotMd} ${styles.dot7}`} />
        <span className={`${styles.dot} ${styles.dotXl} ${styles.dot8}`} />
        <span className={`${styles.dot} ${styles.dotLg} ${styles.dot9}`} />
        <span className={`${styles.dot} ${styles.dotSm} ${styles.dot10}`} />
        <span className={`${styles.dot} ${styles.dotMd} ${styles.dot11}`} />
        <span className={`${styles.dot} ${styles.dotXl} ${styles.dot12}`} />
        <span className={`${styles.dot} ${styles.dotLg} ${styles.dot13}`} />
        <span className={`${styles.dot} ${styles.dotSm} ${styles.dot14}`} />
        <span className={`${styles.dot} ${styles.dotXl} ${styles.dot15}`} />
        <span className={`${styles.dot} ${styles.dotMd} ${styles.dot16}`} />
        <span className={`${styles.dot} ${styles.dotLg} ${styles.dot17}`} />
        <span className={`${styles.dot} ${styles.dotSm} ${styles.dot18}`} />
        <span className={`${styles.dot} ${styles.dotXl} ${styles.dot19}`} />
        <span className={`${styles.dot} ${styles.dotMd} ${styles.dot20}`} />
        <span className={`${styles.dot} ${styles.dotSm} ${styles.dot21}`} />
        <span className={`${styles.dot} ${styles.dotLg} ${styles.dot22}`} />
        <span className={`${styles.dot} ${styles.dotMd} ${styles.dot23}`} />
        <span className={`${styles.dot} ${styles.dotXl} ${styles.dot24}`} />
      </div>
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            DeekeScript 自动化生态，支持私有化部署
          </div>

          <h1 className={styles.title}>
            Android 设备集群自动化<br />管理平台
          </h1>

          <p className={styles.subtitle}>
            一键批量执行自动化脚本。通过移动网络为上百台设备批量下发
            DeekeScript 自动化任务，实时查看设备画面，
            让重复工作 7×24 小时无人值守运行。
          </p>

          <div className={styles.ctas}>
            <button className={styles.btnPrimary} onClick={goToRegister}>
              免费试用
            </button>
            <button className={styles.btnOutline} onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
              在线演示
            </button>
          </div>

          <div className={styles.trust}>
            <span className={styles.trustItem}>Deeke 成熟生态</span>
            <span className={styles.trustDivider} />
            <span className={styles.trustItem}>50+ 企业信赖</span>
            <span className={styles.trustDivider} />
            <span className={styles.trustItem}>10,000+ 设备在线</span>
            <span className={styles.trustDivider} />
            <span className={styles.trustItem}>99.9% 稳定运行</span>
          </div>
        </div>

        <div className={styles.imageWrap}>
          <img className={styles.mockupImg} src="/mobile.png" alt="DeekeHub 移动端界面" loading="lazy" />
        </div>
      </div>

      <div className={styles.scrollHint}>
        <div className={styles.scrollArrow} />
        <span>向下滚动</span>
      </div>
    </section>
  );
};

export default Hero;
