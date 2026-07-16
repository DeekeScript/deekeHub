import { useState } from 'react';
import styles from './index.module.less';

const CTA: React.FC = () => {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>准备好提升自动化效率了吗？</h2>
      <p className={styles.subtitle}>
        立即联系我们，获取专属方案与产品报价
      </p>
      <div className={styles.buttons}>
        <button className={styles.btnPrimary} onClick={() => setShowQR(true)}>
          联系销售
        </button>
      </div>

      {showQR && (
        <div className={styles.modalOverlay} onClick={() => setShowQR(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowQR(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className={styles.modalTitle}>扫码联系销售</h3>
            <img src="/wechat.png" alt="微信二维码" className={styles.modalQR} loading="lazy" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CTA;
