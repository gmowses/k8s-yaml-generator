import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Sun, Moon, Languages } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'K8s YAML Generator',
    subtitle: 'Generate Kubernetes manifests: Deployment, Service, Ingress, HPA. Tabs per resource type. Client-side only.',
    tabs: { deployment: 'Deployment', service: 'Service', ingress: 'Ingress', hpa: 'HPA' },
    output: 'Output', outputDesc: 'Generated YAML manifest',
    copy: 'Copy', copied: 'Copied!', builtBy: 'Built by',
    // Deployment
    appName: 'App Name', namespace: 'Namespace', image: 'Image', tag: 'Tag',
    replicas: 'Replicas', pullPolicy: 'Pull Policy',
    cpuReq: 'CPU Request', memReq: 'Memory Request', cpuLim: 'CPU Limit', memLim: 'Memory Limit',
    containerPort: 'Container Port',
    enableLiveness: 'Liveness Probe', enableReadiness: 'Readiness Probe',
    probePath: 'HTTP Path', probePort: 'Port', probeDelay: 'Initial Delay (s)', probePeriod: 'Period (s)',
    envVars: 'Environment Variables', addEnvVar: 'Add Variable', key: 'KEY', value: 'VALUE',
    // Service
    serviceType: 'Service Type', servicePort: 'Port', targetPort: 'Target Port', nodePort: 'NodePort',
    // Ingress
    ingressClass: 'Ingress Class', host: 'Host', path: 'Path', pathType: 'Path Type',
    enableTls: 'Enable TLS', tlsSecret: 'TLS Secret Name',
    // HPA
    minReplicas: 'Min Replicas', maxReplicas: 'Max Replicas',
    cpuThreshold: 'CPU Target (%)', memThreshold: 'Memory Target (%)', enableMemHpa: 'Enable Memory Metric',
  },
  pt: {
    title: 'Gerador de YAML K8s',
    subtitle: 'Gere manifestos Kubernetes: Deployment, Service, Ingress, HPA. Aba por tipo de recurso. Tudo no navegador.',
    tabs: { deployment: 'Deployment', service: 'Service', ingress: 'Ingress', hpa: 'HPA' },
    output: 'Saida', outputDesc: 'Manifesto YAML gerado',
    copy: 'Copiar', copied: 'Copiado!', builtBy: 'Criado por',
    appName: 'Nome do App', namespace: 'Namespace', image: 'Imagem', tag: 'Tag',
    replicas: 'Replicas', pullPolicy: 'Pull Policy',
    cpuReq: 'CPU Request', memReq: 'Memory Request', cpuLim: 'CPU Limit', memLim: 'Memory Limit',
    containerPort: 'Porta do Container',
    enableLiveness: 'Liveness Probe', enableReadiness: 'Readiness Probe',
    probePath: 'Caminho HTTP', probePort: 'Porta', probeDelay: 'Atraso Inicial (s)', probePeriod: 'Periodo (s)',
    envVars: 'Variaveis de Ambiente', addEnvVar: 'Adicionar Variavel', key: 'CHAVE', value: 'VALOR',
    serviceType: 'Tipo de Service', servicePort: 'Porta', targetPort: 'Target Port', nodePort: 'NodePort',
    ingressClass: 'Ingress Class', host: 'Host', path: 'Caminho', pathType: 'Tipo de Caminho',
    enableTls: 'Habilitar TLS', tlsSecret: 'Nome do Secret TLS',
    minReplicas: 'Min Replicas', maxReplicas: 'Max Replicas',
    cpuThreshold: 'CPU Target (%)', memThreshold: 'Memory Target (%)', enableMemHpa: 'Habilitar Metrica de Memoria',
  },
} as const

type Lang = keyof typeof translations
type TabKey = 'deployment' | 'service' | 'ingress' | 'hpa'

let _uid = 0
const nextId = () => `k-${++_uid}`
interface EnvVar { id: string; key: string; value: string }

interface K8sConfig {
  appName: string; namespace: string; image: string; tag: string
  replicas: string; pullPolicy: string
  cpuReq: string; memReq: string; cpuLim: string; memLim: string
  containerPort: string
  enableLiveness: boolean; lPath: string; lPort: string; lDelay: string; lPeriod: string
  enableReadiness: boolean; rPath: string; rPort: string; rDelay: string; rPeriod: string
  envVars: EnvVar[]
  serviceType: string; servicePort: string; targetPort: string; nodePort: string
  ingressClass: string; host: string; path: string; pathType: string
  enableTls: boolean; tlsSecret: string
  minReplicas: string; maxReplicas: string; cpuThreshold: string
  enableMemHpa: boolean; memThreshold: string
}

const defaultConfig: K8sConfig = {
  appName: 'myapp', namespace: 'default', image: 'myapp', tag: 'latest',
  replicas: '2', pullPolicy: 'IfNotPresent',
  cpuReq: '100m', memReq: '128Mi', cpuLim: '500m', memLim: '512Mi',
  containerPort: '8080',
  enableLiveness: true, lPath: '/healthz', lPort: '8080', lDelay: '15', lPeriod: '20',
  enableReadiness: true, rPath: '/ready', rPort: '8080', rDelay: '5', rPeriod: '10',
  envVars: [],
  serviceType: 'ClusterIP', servicePort: '80', targetPort: '8080', nodePort: '',
  ingressClass: 'nginx', host: 'myapp.example.com', path: '/', pathType: 'Prefix',
  enableTls: true, tlsSecret: 'myapp-tls',
  minReplicas: '2', maxReplicas: '10', cpuThreshold: '70',
  enableMemHpa: false, memThreshold: '80',
}

// ── YAML generators ───────────────────────────────────────────────────────────
function genDeployment(c: K8sConfig): string {
  const envBlock = c.envVars.filter(e => e.key.trim()).map(e =>
    `        - name: ${e.key.trim()}\n          value: "${e.value.trim()}"`
  ).join('\n')

  const probeBlock = (path: string, port: string, delay: string, period: string) =>
    `          httpGet:\n            path: ${path}\n            port: ${port}\n          initialDelaySeconds: ${delay}\n          periodSeconds: ${period}`

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${c.appName}
  namespace: ${c.namespace}
  labels:
    app: ${c.appName}
spec:
  replicas: ${c.replicas}
  selector:
    matchLabels:
      app: ${c.appName}
  template:
    metadata:
      labels:
        app: ${c.appName}
    spec:
      containers:
        - name: ${c.appName}
          image: ${c.image}:${c.tag}
          imagePullPolicy: ${c.pullPolicy}
          ports:
            - containerPort: ${c.containerPort}${c.envVars.filter(e => e.key.trim()).length > 0 ? `\n          env:\n${envBlock}` : ''}
          resources:
            requests:
              cpu: ${c.cpuReq}
              memory: ${c.memReq}
            limits:
              cpu: ${c.cpuLim}
              memory: ${c.memLim}${c.enableLiveness ? `\n          livenessProbe:\n${probeBlock(c.lPath, c.lPort, c.lDelay, c.lPeriod)}` : ''}${c.enableReadiness ? `\n          readinessProbe:\n${probeBlock(c.rPath, c.rPort, c.rDelay, c.rPeriod)}` : ''}`
}

function genService(c: K8sConfig): string {
  const nodePortLine = c.serviceType === 'NodePort' && c.nodePort ? `\n        nodePort: ${c.nodePort}` : ''
  return `apiVersion: v1
kind: Service
metadata:
  name: ${c.appName}
  namespace: ${c.namespace}
  labels:
    app: ${c.appName}
spec:
  type: ${c.serviceType}
  selector:
    app: ${c.appName}
  ports:
    - port: ${c.servicePort}
      targetPort: ${c.targetPort}
      protocol: TCP${nodePortLine}`
}

function genIngress(c: K8sConfig): string {
  const tlsBlock = c.enableTls ? `\n  tls:\n    - hosts:\n        - ${c.host}\n      secretName: ${c.tlsSecret}` : ''
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${c.appName}
  namespace: ${c.namespace}
  annotations:
    kubernetes.io/ingress.class: ${c.ingressClass}
spec:${tlsBlock}
  rules:
    - host: ${c.host}
      http:
        paths:
          - path: ${c.path}
            pathType: ${c.pathType}
            backend:
              service:
                name: ${c.appName}
                port:
                  number: ${c.servicePort}`
}

function genHpa(c: K8sConfig): string {
  const memMetric = c.enableMemHpa ? `    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: ${c.memThreshold}` : ''
  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${c.appName}
  namespace: ${c.namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${c.appName}
  minReplicas: ${c.minReplicas}
  maxReplicas: ${c.maxReplicas}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: ${c.cpuThreshold}${c.enableMemHpa ? `\n${memMetric}` : ''}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function K8sYamlGenerator() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [tab, setTab] = useState<TabKey>('deployment')
  const [config, setConfig] = useState<K8sConfig>(defaultConfig)
  const [copied, setCopied] = useState(false)

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const outputs: Record<TabKey, string> = {
    deployment: genDeployment(config),
    service: genService(config),
    ingress: genIngress(config),
    hpa: genHpa(config),
  }
  const output = outputs[tab]

  const patch = (p: Partial<K8sConfig>) => setConfig(c => ({ ...c, ...p }))

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }, [output])

  const addEnvVar = () => setConfig(c => ({ ...c, envVars: [...c.envVars, { id: nextId(), key: '', value: '' }] }))
  const updateEnvVar = (id: string, field: 'key' | 'value', val: string) =>
    setConfig(c => ({ ...c, envVars: c.envVars.map(e => e.id === id ? { ...e, [field]: val } : e) }))
  const removeEnvVar = (id: string) => setConfig(c => ({ ...c, envVars: c.envVars.filter(e => e.id !== id) }))

  const inputCls = 'w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'
  const tabCls = (active: boolean) => `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-blue-500 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`
  const checkCls = 'h-4 w-4 cursor-pointer accent-blue-500 rounded'
  const sectionCls = 'space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-4'

  const tabs: TabKey[] = ['deployment', 'service', 'ingress', 'hpa']

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M10.204 14.35l.007.01-.999 2.413a5.171 5.171 0 0 1-2.075-2.597l2.578-.437.004.005.485.606zm-.833-2.129l.015-.015-.013-.022-.012.022.01.015zm2.595-2.025a1.277 1.277 0 0 1 .466.085l1.295-1.02a2.96 2.96 0 1 0-1.76 4.87v-1.48a1.5 1.5 0 0 1-.001-2.455zm1.784 1.527l-.013.01.013.012.013-.012-.013-.01zm-1.26 2.063l.01.015.015-.015-.015-.01-.01.01zm-.524-1.043l-.025.024.025.025.024-.025-.024-.024zm-1.502.554a2.977 2.977 0 0 1-.175-.588l-2.61.443-.007-.01-.374-.588-.006.004-.01-.016L5.8 13.36A7.205 7.205 0 0 0 7.5 18l1.706-2.88.015-.012-.013-.014.285-.598zm5.517-3.038l-1.289 1.015c.107.217.172.46.172.72v.005l1.523-.26.09-.015-.002-.012 1.12-1.064-.007-.007.007-.006-.71-.852-.875.452-.03.024zm1.046 2.28l-.012.004.006.01.006-.014zm-3.547 3.456l.63-2.552-.012-.009-.013.009-.57 2.333-1.553-.261.005.013-.018-.006L11.5 18.11a7.238 7.238 0 0 0 2.736-.11l-.682-2.04-.01.005-.01-.005.006-.013-1.513.256zm1.017-.3l.019.003.003-.019-.019-.004-.003.02zm4.41-8.24l-2.91 2.77.03.048.051-.023 2.905-2.767L18 7.52 12 4.5 6 7.52l.468.734 2.905 2.767.05.023.03-.048-2.908-2.77L12 5.6l5.453 2.626z"/></svg>
            </div>
            <span className="font-semibold">K8s YAML Generator</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/k8s-yaml-generator" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit">
            {tabs.map(tk => (
              <button key={tk} onClick={() => setTab(tk)} className={tabCls(tab === tk)}>{t.tabs[tk]}</button>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Config */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">

              {/* Shared: app name, namespace */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t.appName}</label>
                  <input className={inputCls} value={config.appName} onChange={e => patch({ appName: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>{t.namespace}</label>
                  <input className={inputCls} value={config.namespace} onChange={e => patch({ namespace: e.target.value })} />
                </div>
              </div>

              {/* Deployment tab */}
              {tab === 'deployment' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>{t.image}</label>
                      <input className={inputCls} value={config.image} onChange={e => patch({ image: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>{t.tag}</label>
                      <input className={inputCls} value={config.tag} onChange={e => patch({ tag: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>{t.replicas}</label>
                      <input className={inputCls} type="number" min="1" value={config.replicas} onChange={e => patch({ replicas: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>{t.containerPort}</label>
                      <input className={inputCls} value={config.containerPort} onChange={e => patch({ containerPort: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>{t.pullPolicy}</label>
                      <select className={inputCls} value={config.pullPolicy} onChange={e => patch({ pullPolicy: e.target.value })}>
                        {['IfNotPresent', 'Always', 'Never'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={sectionCls}>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Resources</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelCls}>{t.cpuReq}</label><input className={inputCls} value={config.cpuReq} onChange={e => patch({ cpuReq: e.target.value })} /></div>
                      <div><label className={labelCls}>{t.memReq}</label><input className={inputCls} value={config.memReq} onChange={e => patch({ memReq: e.target.value })} /></div>
                      <div><label className={labelCls}>{t.cpuLim}</label><input className={inputCls} value={config.cpuLim} onChange={e => patch({ cpuLim: e.target.value })} /></div>
                      <div><label className={labelCls}>{t.memLim}</label><input className={inputCls} value={config.memLim} onChange={e => patch({ memLim: e.target.value })} /></div>
                    </div>
                  </div>
                  <div className={sectionCls}>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Probes</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className={checkCls} checked={config.enableLiveness} onChange={e => patch({ enableLiveness: e.target.checked })} />
                      <span className="text-sm">{t.enableLiveness}</span>
                    </label>
                    {config.enableLiveness && (
                      <div className="pl-6 grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>{t.probePath}</label><input className={inputCls} value={config.lPath} onChange={e => patch({ lPath: e.target.value })} /></div>
                        <div><label className={labelCls}>{t.probePort}</label><input className={inputCls} value={config.lPort} onChange={e => patch({ lPort: e.target.value })} /></div>
                        <div><label className={labelCls}>{t.probeDelay}</label><input className={inputCls} value={config.lDelay} onChange={e => patch({ lDelay: e.target.value })} /></div>
                        <div><label className={labelCls}>{t.probePeriod}</label><input className={inputCls} value={config.lPeriod} onChange={e => patch({ lPeriod: e.target.value })} /></div>
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className={checkCls} checked={config.enableReadiness} onChange={e => patch({ enableReadiness: e.target.checked })} />
                      <span className="text-sm">{t.enableReadiness}</span>
                    </label>
                    {config.enableReadiness && (
                      <div className="pl-6 grid grid-cols-2 gap-2">
                        <div><label className={labelCls}>{t.probePath}</label><input className={inputCls} value={config.rPath} onChange={e => patch({ rPath: e.target.value })} /></div>
                        <div><label className={labelCls}>{t.probePort}</label><input className={inputCls} value={config.rPort} onChange={e => patch({ rPort: e.target.value })} /></div>
                        <div><label className={labelCls}>{t.probeDelay}</label><input className={inputCls} value={config.rDelay} onChange={e => patch({ rDelay: e.target.value })} /></div>
                        <div><label className={labelCls}>{t.probePeriod}</label><input className={inputCls} value={config.rPeriod} onChange={e => patch({ rPeriod: e.target.value })} /></div>
                      </div>
                    )}
                  </div>
                  <div className={sectionCls}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t.envVars}</p>
                      <button onClick={addEnvVar} className="text-xs border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">+ {t.addEnvVar}</button>
                    </div>
                    {config.envVars.map(e => (
                      <div key={e.id} className="flex items-center gap-2">
                        <input className={inputCls} placeholder={t.key} value={e.key} onChange={ev => updateEnvVar(e.id, 'key', ev.target.value)} />
                        <span className="text-zinc-400 shrink-0">=</span>
                        <input className={inputCls} placeholder={t.value} value={e.value} onChange={ev => updateEnvVar(e.id, 'value', ev.target.value)} />
                        <button onClick={() => removeEnvVar(e.id)} className="text-zinc-400 hover:text-red-500 p-1 transition-colors">x</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Service tab */}
              {tab === 'service' && (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>{t.serviceType}</label>
                    <select className={inputCls} value={config.serviceType} onChange={e => patch({ serviceType: e.target.value })}>
                      {['ClusterIP', 'NodePort', 'LoadBalancer'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={labelCls}>{t.servicePort}</label><input className={inputCls} value={config.servicePort} onChange={e => patch({ servicePort: e.target.value })} /></div>
                    <div><label className={labelCls}>{t.targetPort}</label><input className={inputCls} value={config.targetPort} onChange={e => patch({ targetPort: e.target.value })} /></div>
                    {config.serviceType === 'NodePort' && <div><label className={labelCls}>{t.nodePort}</label><input className={inputCls} placeholder="30000" value={config.nodePort} onChange={e => patch({ nodePort: e.target.value })} /></div>}
                  </div>
                </div>
              )}

              {/* Ingress tab */}
              {tab === 'ingress' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>{t.ingressClass}</label><input className={inputCls} value={config.ingressClass} onChange={e => patch({ ingressClass: e.target.value })} /></div>
                    <div><label className={labelCls}>{t.host}</label><input className={inputCls} value={config.host} onChange={e => patch({ host: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>{t.path}</label><input className={inputCls} value={config.path} onChange={e => patch({ path: e.target.value })} /></div>
                    <div>
                      <label className={labelCls}>{t.pathType}</label>
                      <select className={inputCls} value={config.pathType} onChange={e => patch({ pathType: e.target.value })}>
                        {['Prefix', 'Exact', 'ImplementationSpecific'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className={checkCls} checked={config.enableTls} onChange={e => patch({ enableTls: e.target.checked })} />
                    <span className="text-sm">{t.enableTls}</span>
                  </label>
                  {config.enableTls && (
                    <div className="pl-6">
                      <label className={labelCls}>{t.tlsSecret}</label>
                      <input className={inputCls} value={config.tlsSecret} onChange={e => patch({ tlsSecret: e.target.value })} />
                    </div>
                  )}
                </div>
              )}

              {/* HPA tab */}
              {tab === 'hpa' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>{t.minReplicas}</label><input className={inputCls} type="number" min="1" value={config.minReplicas} onChange={e => patch({ minReplicas: e.target.value })} /></div>
                    <div><label className={labelCls}>{t.maxReplicas}</label><input className={inputCls} type="number" min="1" value={config.maxReplicas} onChange={e => patch({ maxReplicas: e.target.value })} /></div>
                  </div>
                  <div>
                    <label className={labelCls}>{t.cpuThreshold}</label>
                    <input className={inputCls} type="number" min="1" max="100" value={config.cpuThreshold} onChange={e => patch({ cpuThreshold: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className={checkCls} checked={config.enableMemHpa} onChange={e => patch({ enableMemHpa: e.target.checked })} />
                    <span className="text-sm">{t.enableMemHpa}</span>
                  </label>
                  {config.enableMemHpa && (
                    <div className="pl-6">
                      <label className={labelCls}>{t.memThreshold}</label>
                      <input className={inputCls} type="number" min="1" max="100" value={config.memThreshold} onChange={e => patch({ memThreshold: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Output */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="font-semibold text-sm">{t.output}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.outputDesc}</p>
                </div>
                <button onClick={handleCopy} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre">{output}</pre>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
