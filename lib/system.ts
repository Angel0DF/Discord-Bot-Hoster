import os from 'os';
import { SystemStats } from './types';

let prevCpus = os.cpus();

function getCpuUsage(): number {
  const currentCpus = os.cpus();
  let idleDifference = 0;
  let totalDifference = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const prev = prevCpus[i]?.times || { idle: 0, user: 0, nice: 0, sys: 0, irq: 0 };
    const curr = currentCpus[i].times;

    const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
    const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;

    idleDifference += curr.idle - prev.idle;
    totalDifference += currTotal - prevTotal;
  }

  prevCpus = currentCpus;
  if (totalDifference === 0) return 0;
  const usage = 100 - (100 * idleDifference) / totalDifference;
  return Math.max(0, Math.min(100, Math.round(usage * 10) / 10));
}

export function getSystemStats(): SystemStats {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 1000) / 10;
  const cpus = os.cpus();

  // Check if running inside LXC / QEMU / Proxmox VM
  const platform = os.platform();
  const hostname = os.hostname();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown CPU';

  const isProxmoxGuest = 
    cpuModel.toLowerCase().includes('qemu') || 
    cpuModel.toLowerCase().includes('kvm') ||
    hostname.toLowerCase().includes('pve') ||
    hostname.toLowerCase().includes('lxc');

  return {
    hostname,
    platform: `${platform} (${os.release()})`,
    uptime: Math.floor(os.uptime()),
    cpuModel,
    cpuCores: cpus.length,
    cpuUsage: getCpuUsage(),
    totalMem,
    freeMem,
    usedMem,
    memUsagePercent,
    nodeVersion: process.version,
    isProxmoxGuest,
  };
}

