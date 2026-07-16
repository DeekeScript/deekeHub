import styles from './index.module.less';

const VideoDemo: React.FC = () => (
  <div className={styles.wrap}>
    <div className={styles.playerWrap}>
      <video
        className={styles.video}
        src="/deekeHub.mp4"
        controls
        preload="metadata"
      />
    </div>
  </div>
);

export default VideoDemo;
