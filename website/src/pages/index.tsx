import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

// 特性列表
const features = [
  {
    title: '多集群统一管理',
    icon: '🌐',
    description: '一个控制台管理所有 Kubernetes 集群，支持公有云、私有云、边缘集群，统一视图，统一操作。',
  },
  {
    title: '可视化工作负载',
    icon: '📊',
    description: '直观的可视化界面，轻松管理 Deployment、StatefulSet、DaemonSet 等各类工作负载，支持 YAML 编辑和表单编辑。',
  },
  {
    title: '实时监控告警',
    icon: '📈',
    description: '集成 Prometheus + Grafana，实时监控集群资源使用情况，智能告警及时发现异常，保障业务稳定运行。',
  },
  {
    title: 'Web 终端',
    icon: '💻',
    description: '无需本地工具，直接在浏览器中通过 WebSocket 连接 Pod 终端、SSH 到节点、执行 kubectl 命令。',
  },
  {
    title: '细粒度权限控制',
    icon: '🔐',
    description: '基于 RBAC 的权限管理，支持自定义角色、用户组、资源级别的细粒度权限控制，保障多租户安全。',
  },
  {
    title: 'GitOps 集成',
    icon: '🔄',
    description: '与 ArgoCD 深度集成，支持 GitOps 工作流，实现应用的声明式部署和持续交付。',
  },
];

// 使用场景
const useCases = [
  {
    title: '开发团队',
    description: '简化开发者与 Kubernetes 的交互，无需记忆复杂命令，快速查看应用状态、排查问题。',
    icon: '👨‍💻',
  },
  {
    title: '运维团队',
    description: '统一管理多个集群，监控资源使用，快速响应告警，提高运维效率。',
    icon: '🛠️',
  },
  {
    title: '平台工程',
    description: '构建企业内部开发者平台，为团队提供标准化的 Kubernetes 使用体验。',
    icon: '🏗️',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <p className="hero__subtitle">
            企业级 Kubernetes 多集群管理平台<br />
            <span className={styles.heroHighlight}>简化复杂，赋能团队</span>
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started/quick-start">
              🚀 快速开始
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="https://github.com/kubepolaris/kubepolaris">
              ⭐ GitHub
            </Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNumber}>30+</span>
              <span className={styles.heroStatLabel}>核心功能</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNumber}>100%</span>
              <span className={styles.heroStatLabel}>开源免费</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNumber}>∞</span>
              <span className={styles.heroStatLabel}>集群支持</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function FeatureSection() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>为什么选择 KubePolaris?</h2>
          <p className={styles.sectionSubtitle}>
            专为企业设计的 Kubernetes 管理平台，让容器编排变得简单高效
          </p>
        </div>
        <div className={clsx('row', styles.featureGrid, 'animate-stagger')}>
          {features.map((feature, idx) => (
            <div key={idx} className="col col--4">
              <div className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCaseSection() {
  return (
    <section className={styles.useCases}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>适用场景</h2>
          <p className={styles.sectionSubtitle}>
            无论你是开发者、运维工程师还是平台工程师，KubePolaris 都能帮助你更高效地工作
          </p>
        </div>
        <div className={clsx('row', styles.useCaseGrid)}>
          {useCases.map((useCase, idx) => (
            <div key={idx} className="col col--4">
              <div className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>{useCase.icon}</div>
                <h3 className={styles.useCaseTitle}>{useCase.title}</h3>
                <p className={styles.useCaseDescription}>{useCase.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStartSection() {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>快速开始</h2>
          <p className={styles.sectionSubtitle}>
            只需几分钟，即可部署并开始使用 KubePolaris
          </p>
        </div>
        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span className={styles.codeDot} style={{background: '#ff5f57'}}></span>
            <span className={styles.codeDot} style={{background: '#febc2e'}}></span>
            <span className={styles.codeDot} style={{background: '#28c840'}}></span>
            <span className={styles.codeTitle}>Terminal</span>
          </div>
          <pre className={styles.codeContent}>
            <code>
{`# 使用 Helm 安装
helm repo add kubepolaris https://kubepolaris.github.io/charts
helm install kubepolaris kubepolaris/kubepolaris -n kubepolaris --create-namespace

# 或使用 Docker Compose 快速体验
git clone https://github.com/kubepolaris/kubepolaris.git
cd kubepolaris
docker-compose up -d`}
            </code>
          </pre>
        </div>
        <div className={styles.quickStartLinks}>
          <Link className="button button--primary button--lg" to="/docs/getting-started/installation">
            📖 查看完整安装指南
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>准备好开始了吗？</h2>
          <p className={styles.ctaSubtitle}>
            加入 KubePolaris 社区，与全球开发者一起构建更好的 Kubernetes 管理体验
          </p>
          <div className={styles.ctaButtons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/quick-start">
              立即开始
            </Link>
            <Link className="button button--outline button--lg" to="https://github.com/kubepolaris/kubepolaris/discussions">
              加入社区
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - 企业级 Kubernetes 多集群管理平台`}
      description="KubePolaris 是一个开源的企业级 Kubernetes 多集群管理平台，提供可视化工作负载管理、实时监控告警、Web 终端等功能。">
      <HomepageHeader />
      <main>
        <FeatureSection />
        <UseCaseSection />
        <QuickStartSection />
        <CTASection />
      </main>
    </Layout>
  );
}

