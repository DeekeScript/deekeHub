import styles from './index.module.less';

const icons = {
  devices: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
    </svg>
  ),
  script: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  screen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  remote: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-3z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  api: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <line x1="8" y1="12" x2="16" y2="7" />
      <line x1="8" y1="12" x2="16" y2="17" />
    </svg>
  ),
  server: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  customize: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="16 13 14 15 16 17" />
      <polyline points="10 13 8 15 10 17" />
    </svg>
  ),
};

const features = [
  {
    icon: 'devices',
    title: '多设备管理',
    desc: '统一管控所有 Android 设备，支持批量群控、分组管理，设备状态实时监控，离线即时告警。',
  },
  {
    icon: 'script',
    title: '批量脚本执行',
    desc: '一次编写脚本，多设备并行运行，支持定时、触发等多种执行策略，效率提升数十倍。',
  },
  {
    icon: 'screen',
    title: '实时设备画面',
    desc: '基于 WebRTC 的毫秒级投屏技术，实时查看和控制设备画面，流畅度媲美本地操作。',
  },
  {
    icon: 'remote',
    title: '远程控制',
    desc: '随时随地通过浏览器接入，远程操控设备，无需安装额外插件。',
  },
  {
    icon: 'shield',
    title: '权限管理',
    desc: '精细化角色权限体系，支持开发者、运营者多级权限，操作全程可审计追溯。',
  },
  {
    icon: 'api',
    title: 'API 开放',
    desc: '提供完整的 RESTful API 接口，支持与现有业务系统无缝集成，灵活扩展。',
  },
  {
    icon: 'server',
    title: '私有化部署',
    desc: '数据完全部署在您的服务器上，不出网满足企业合规与安全监管要求。',
  },
  {
    icon: 'customize',
    title: 'OEM 贴牌',
    desc: '支持品牌化定制，Logo、域名、UI 全面可配，快速交付您的客户。',
  },
  {
    icon: 'code',
    title: '源码授权',
    desc: '提供源码级合作模式，支持二次开发和深度定制，完全掌控产品迭代。',
  },
];

const Features: React.FC = () => (
  <div>
    <div className={styles.header}>
      <span className="sectionLabel">核心功能</span>
      <h2 className="sectionTitle">一站式自动化管理，覆盖全场景需求</h2>
      <p className="sectionDesc" style={{ margin: '0 auto' }}>
        从设备管理到脚本执行，从实时监控到数据分析，DeekeHub 提供完整的自动化解决方案
      </p>
    </div>

    <div className={styles.grid}>
      {features.map((item) => (
        <div key={item.title} className={styles.card}>
          <div className={styles.iconBox}>{icons[item.icon as keyof typeof icons]}</div>
          <h3 className={styles.cardTitle}>{item.title}</h3>
          <p className={styles.cardDesc}>{item.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

export default Features;
