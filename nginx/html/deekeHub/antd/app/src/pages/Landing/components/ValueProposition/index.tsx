import styles from './index.module.less';

const xIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const checkIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const comparisons = [
  {
    label: '连接方式',
    build: '依赖 ADB / USB 调试，设备必须通过数据线连接电脑，无法远程接入',
    dke: '移动网络 / Wi-Fi 即连，无需开启 USB 调试模式，设备随时随地在线',
  },
  {
    label: '部署模式',
    build: '本地单机工具，一人一机操作，无法多人协作或跨地域管理设备',
    dke: '云端平台，一处部署多地使用，支持多角色协作，设备集中管控',
  },
  {
    label: '开发周期',
    build: '从零搭建设备管理后端、前端、通信层，至少需要 3-6 个月',
    dke: '开箱即用，当天完成部署上线，团队直接聚焦业务逻辑开发',
  },
  {
    label: '规模化能力',
    build: '受限于 USB 端口数和物理距离，设备规模难以扩展，维护成本高昂',
    dke: '弹性扩容架构，单节点支持 1000+ 设备并发，线性扩展无瓶颈',
  },
];

const solved = [
  'Android 跨版本兼容，自动断线重连、心跳保活',
  '多设备并发调度引擎，任务队列自动分配与容错',
  '低延迟实时画面传输，WebRTC 编码优化',
  '权限隔离、操作审计、数据加密，企业级安全',
];

const values = [
  {
    title: '节省 3-6 个月研发',
    desc: '底层设备通信、调度、传输链路已在数十万台设备上验证成熟，你的团队无需重复造轮子，直接调用 API 进入业务开发。',
  },
  {
    title: 'OEM 贴牌，直接商业化',
    desc: '支持白标授权，Logo、域名、主题色全面自定义，搭配二次开发接口，快速交付属于你品牌的自动化产品。',
  },
  {
    title: '私有部署，数据自主',
    desc: '所有数据存储在你的服务器上，不出网、不共享，满足金融、政务等行业的合规审计要求，数据安全完全由你掌控。',
  },
  {
    title: '零成本验证业务',
    desc: '无需前期投入研发资源，先用 DeekeHub 跑通从设备连接到任务执行的完整链路，验证商业模式后再决定深度定制。',
  },
];

const ValueProposition: React.FC = () => (
  <div className={styles.wrap}>
    <div className={styles.header}>
      <span className="sectionLabel">为什么选择 DeekeHub</span>
      <h2 className="sectionTitle">告别线缆束缚，设备管理进入网络时代</h2>
      <p className={styles.summary}>
        传统 ADB 调试方案无法规模化。DeekeHub 通过移动网络 / 云端连接，
        彻底摆脱 USB 线缆束缚，让 Android 设备管理进入网络化时代。
      </p>
    </div>

    {/* ====== Contrast: 传统方案 vs DeekeHub ====== */}
    <div className={styles.contrastSection}>
      <div className={styles.contrastHeader}>
        <span className={styles.contrastBadgeOld}>传统 ADB 方案</span>
        <span className={styles.contrastVs}>vs</span>
        <span className={styles.contrastBadgeNew}>DeekeHub</span>
      </div>

      <div className={styles.contrastList}>
        {comparisons.map((item) => (
          <div key={item.label} className={styles.contrastRow}>
            <div className={styles.contrastLabel}>{item.label}</div>
            <div className={styles.contrastOld}>
              <span className={styles.contrastIconOld}>{xIcon}</span>
              <span>{item.build}</span>
            </div>
            <div className={styles.contrastNew}>
              <span className={styles.contrastIconNew}>{checkIcon}</span>
              <span>{item.dke}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ====== 已解决的核心问题 ====== */}
    <div className={styles.solvedSection}>
      <h3 className={styles.subTitle}>复杂工程问题，已被封装</h3>
      <div className={styles.solvedGrid}>
        {solved.map((text) => (
          <div key={text} className={styles.solvedItem}>
            <span className={styles.solvedIcon}>{checkIcon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>

    {/* ====== 商业价值 ====== */}
    <div className={styles.valueGrid}>
      {values.map((item) => (
        <div key={item.title} className={styles.valueCard}>
          <h4 className={styles.valueTitle}>{item.title}</h4>
          <p className={styles.valueDesc}>{item.desc}</p>
        </div>
      ))}
    </div>

    <p className={styles.closing}>
      ADB 方案已经过时。把设备管理交给 DeekeHub，你的团队只做一件事：赚钱。
    </p>
  </div>
);

export default ValueProposition;
