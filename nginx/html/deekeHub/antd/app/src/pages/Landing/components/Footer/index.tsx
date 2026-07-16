import { Link } from 'umi';
import styles from './index.module.less';

const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <img src="/logo.png" alt="DeekeHub" className={styles.logoImg} />
            <span>DeekeHub</span>
          </Link>
          <p className={styles.desc}>
            智能多设备自动化管理平台，帮助企业和开发者高效管理 Android 设备集群，实现自动化运营。
          </p>
        </div>

<div className={styles.column}>
          <h4>友情链接</h4>
          <a href="https://www.deeke.cn" target="_blank" rel="noopener noreferrer">Deeke 官网</a>
          <a href="https://doc.deeke.cn" target="_blank" rel="noopener noreferrer">DeekeScript 开发文档</a>
        </div>

        <div className={styles.qrCol}>
          <h4>联系我们</h4>
          <div className={styles.qrWrap}>
            <div className={styles.qrItem}>
              <img src="/qiwei.png" alt="企业微信" className={styles.qrImg} loading="lazy" />
              <span className={styles.qrLabel}>企业微信</span>
            </div>
            <div className={styles.qrItem}>
              <img src="/wechat.png" alt="微信" className={styles.qrImg} loading="lazy" />
              <span className={styles.qrLabel}>微信</span>
            </div>
          </div>
        </div>

        <div className={styles.qrCol}>
          <h4>Android 客户端下载</h4>
          <div className={styles.qrWrap}>
            <div className={styles.qrItem}>
              <img src="/app.png" alt="DeekeHub APP下载" className={styles.qrImg} loading="lazy" />
              <span className={styles.qrLabel}>DeekeHub App下载</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>&copy; {new Date().getFullYear()} 武汉市嘀客网络科技有限公司. 保留所有权利。</span>
        <span>鄂ICP备2023007944号-3</span>
      </div>
    </div>
  </footer>
);

export default Footer;
