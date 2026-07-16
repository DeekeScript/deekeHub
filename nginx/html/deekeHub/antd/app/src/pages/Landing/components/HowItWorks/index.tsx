import styles from './index.module.less';

const steps = [
  { number: '01', title: '注册账号', desc: '开发者账号快速注册，即刻体验核心功能，无需繁琐流程' },
  { number: '02', title: '激活设备', desc: 'Android 手机安装 DeekeHub 客户端，激活码一键绑定，设备即时上线' },
  { number: '03', title: '创建脚本', desc: '在线编写自动化脚本，灵活应对各类业务场景，一次编写多机执行' },
  { number: '04', title: '自动运行', desc: '7×24 小时无人值守执行，任务状态实时可见，异常自动告警' },
];

const HowItWorks: React.FC = () => (
  <div>
    <div className={styles.header}>
      <span className="sectionLabel">使用流程</span>
      <h2 className="sectionTitle">四步开启自动化之旅</h2>
      <p className="sectionDesc" style={{ margin: '0 auto' }}>
        从注册到运行，最快 5 分钟即可完成全部部署
      </p>
    </div>

    <div className={styles.timeline}>
      {steps.map((step) => (
        <div key={step.number} className={styles.step}>
          <div className={styles.stepNumber}>{step.number}</div>
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepDesc}>{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default HowItWorks;
