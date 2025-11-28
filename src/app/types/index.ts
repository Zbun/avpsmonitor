export interface VPSNode {
  id: string;
  name: string;
  location: string;
  countryCode: string;
  uptime: number; // in seconds
  protocol: string;
  online: boolean;
}

export interface SystemResources {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  load: number[];
}

export interface NetworkMetrics {
  monthlyTraffic: {
    used: number;
    total: number;
  };
  totalTraffic: {
    upload: number;
    download: number;
  };
  currentSpeed: {
    upload: number;
    download: number;
  };
}

export interface ISPLatency {
  name: string;
  code: string;
  latency: number | null;
  status: 'good' | 'warning' | 'poor' | 'offline';
}

export interface VPSStatus {
  node: VPSNode;
  resources: SystemResources;
  network: NetworkMetrics;
  ispLatency: ISPLatency[];
  timestamp: number;
}
