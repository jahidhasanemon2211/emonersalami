const RouterOSAPI = require('node-routeros').RouterOSAPI;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MikroTikService {
  constructor() {
    this.pools = new Map();
  }

  /**
   * Helper to fetch router credentials from the database and decrypt password
   * @param {string} routerId
   */
  async _getRouterConfig(routerId) {
    const router = await prisma.router.findUnique({ where: { id: routerId } });
    if (!router) {
      throw new Error(`Router not found: ${routerId}`);
    }
    // In a real scenario, you should decrypt the password here using your `encrypt.util.js`
    const password = router.password; // Assuming plaintext for stub or decrypt(router.password)

    return {
      host: router.ipAddress,
      user: router.username,
      password: password,
      port: router.port || 8728
    };
  }

  /**
   * Establish connection to MikroTik router or get from pool
   * @param {string} routerId
   * @returns {Promise<RouterOSAPI>}
   */
  async getConnection(routerId) {
    if (this.pools.has(routerId)) {
      const conn = this.pools.get(routerId);
      if (conn.connected) {
         return conn;
      }
      this.pools.delete(routerId); // cleanup stale connection
    }

    const config = await this._getRouterConfig(routerId);
    const conn = new RouterOSAPI({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
      keepalive: true
    });

    try {
      await conn.connect();
      this.pools.set(routerId, conn);

      // Handle connection close
      conn.on('error', (err) => {
         console.error(`MikroTik connection error [${routerId}]:`, err);
         this.pools.delete(routerId);
      });
      conn.on('close', () => {
         console.log(`MikroTik connection closed [${routerId}]`);
         this.pools.delete(routerId);
      });

      return conn;
    } catch (err) {
      console.error(`Failed to connect to MikroTik [${routerId}]:`, err);
      throw new Error('Failed to connect to router');
    }
  }

  // ==========================================
  // PPPoE Operations
  // ==========================================

  async createPPPoEUser({ routerId, username, password, profile, service = 'pppoe' }) {
    const conn = await this.getConnection(routerId);
    try {
      const response = await conn.write('/ppp/secret/add', [
        `=name=${username}`,
        `=password=${password}`,
        `=profile=${profile}`,
        `=service=${service}`
      ]);
      return response;
    } catch (err) {
      throw new Error(`Failed to create PPPoE user: ${err.message}`);
    }
  }

  async deletePPPoEUser({ routerId, username }) {
    const conn = await this.getConnection(routerId);
    try {
      // Find user ID first
      const users = await conn.write('/ppp/secret/print', [`?name=${username}`]);
      if (users.length === 0) throw new Error('User not found on router');

      const internalId = users[0]['.id'];
      await conn.write('/ppp/secret/remove', [`=.id=${internalId}`]);
      return true;
    } catch (err) {
      throw new Error(`Failed to delete PPPoE user: ${err.message}`);
    }
  }

  async enablePPPoEUser({ routerId, username }) {
    const conn = await this.getConnection(routerId);
    try {
      const users = await conn.write('/ppp/secret/print', [`?name=${username}`]);
      if (users.length === 0) throw new Error('User not found on router');

      const internalId = users[0]['.id'];
      await conn.write('/ppp/secret/enable', [`=.id=${internalId}`]);
      return true;
    } catch (err) {
      throw new Error(`Failed to enable PPPoE user: ${err.message}`);
    }
  }

  async disablePPPoEUser({ routerId, username }) {
    const conn = await this.getConnection(routerId);
    try {
      const users = await conn.write('/ppp/secret/print', [`?name=${username}`]);
      if (users.length === 0) throw new Error('User not found on router');

      const internalId = users[0]['.id'];
      await conn.write('/ppp/secret/disable', [`=.id=${internalId}`]);

      // Also kick active connection if exists
      await this.kickUser({ routerId, username });

      return true;
    } catch (err) {
      throw new Error(`Failed to disable PPPoE user: ${err.message}`);
    }
  }

  async getPPPoEActiveUsers(routerId) {
    const conn = await this.getConnection(routerId);
    try {
      const activeUsers = await conn.write('/ppp/active/print');
      return activeUsers;
    } catch (err) {
      throw new Error(`Failed to get active PPPoE users: ${err.message}`);
    }
  }

  // ==========================================
  // Hotspot Operations
  // ==========================================

  async createHotspotUser({ routerId, username, password, profile, limitUptime, limitBytes }) {
    const conn = await this.getConnection(routerId);
    try {
      let args = [
        `=name=${username}`,
        `=password=${password}`,
        `=profile=${profile}`
      ];
      if (limitUptime) args.push(`=limit-uptime=${limitUptime}`);
      if (limitBytes) args.push(`=limit-bytes-total=${limitBytes}`);

      const response = await conn.write('/ip/hotspot/user/add', args);
      return response;
    } catch (err) {
      throw new Error(`Failed to create Hotspot user: ${err.message}`);
    }
  }

  async deleteHotspotUser({ routerId, username }) {
    const conn = await this.getConnection(routerId);
    try {
      const users = await conn.write('/ip/hotspot/user/print', [`?name=${username}`]);
      if (users.length === 0) throw new Error('User not found on router');

      const internalId = users[0]['.id'];
      await conn.write('/ip/hotspot/user/remove', [`=.id=${internalId}`]);
      return true;
    } catch (err) {
      throw new Error(`Failed to delete Hotspot user: ${err.message}`);
    }
  }

  async getHotspotActiveUsers(routerId) {
    const conn = await this.getConnection(routerId);
    try {
      const activeUsers = await conn.write('/ip/hotspot/active/print');
      return activeUsers;
    } catch (err) {
      throw new Error(`Failed to get active Hotspot users: ${err.message}`);
    }
  }

  // ==========================================
  // Queue Operations (Speed Limits)
  // ==========================================

  async createSimpleQueue({ routerId, name, target, maxUpload, maxDownload }) {
    const conn = await this.getConnection(routerId);
    try {
      // MikroTik expects max-limit="upload/download" (e.g. "5M/5M")
      const maxLimit = `${maxUpload}/${maxDownload}`;
      const response = await conn.write('/queue/simple/add', [
        `=name=${name}`,
        `=target=${target}`,
        `=max-limit=${maxLimit}`
      ]);
      return response;
    } catch (err) {
      throw new Error(`Failed to create queue: ${err.message}`);
    }
  }

  async updateQueue({ routerId, queueName, maxUpload, maxDownload }) {
    const conn = await this.getConnection(routerId);
    try {
      const queues = await conn.write('/queue/simple/print', [`?name=${queueName}`]);
      if (queues.length === 0) throw new Error('Queue not found');

      const internalId = queues[0]['.id'];
      const maxLimit = `${maxUpload}/${maxDownload}`;
      await conn.write('/queue/simple/set', [
        `=.id=${internalId}`,
        `=max-limit=${maxLimit}`
      ]);
      return true;
    } catch (err) {
      throw new Error(`Failed to update queue: ${err.message}`);
    }
  }

  async deleteQueue({ routerId, queueName }) {
    const conn = await this.getConnection(routerId);
    try {
      const queues = await conn.write('/queue/simple/print', [`?name=${queueName}`]);
      if (queues.length === 0) return false;

      const internalId = queues[0]['.id'];
      await conn.write('/queue/simple/remove', [`=.id=${internalId}`]);
      return true;
    } catch (err) {
      throw new Error(`Failed to delete queue: ${err.message}`);
    }
  }

  async getQueues(routerId) {
    const conn = await this.getConnection(routerId);
    try {
      return await conn.write('/queue/simple/print');
    } catch (err) {
      throw new Error(`Failed to get queues: ${err.message}`);
    }
  }

  // ==========================================
  // Monitoring & Utilities
  // ==========================================

  async getRouterStatus(routerId) {
    const conn = await this.getConnection(routerId);
    try {
      const resource = await conn.write('/system/resource/print');
      const identity = await conn.write('/system/identity/print');
      const health = await conn.write('/system/health/print');

      return {
        identity: identity[0].name,
        cpuLoad: resource[0]['cpu-load'],
        freeMemory: resource[0]['free-memory'],
        totalMemory: resource[0]['total-memory'],
        uptime: resource[0]['uptime'],
        boardName: resource[0]['board-name'],
        version: resource[0]['version'],
        health: health[0] || {}
      };
    } catch (err) {
      throw new Error(`Failed to get router status: ${err.message}`);
    }
  }

  async getInterfaceTraffic({ routerId, interfaceName }) {
    const conn = await this.getConnection(routerId);
    try {
      const traffic = await conn.write('/interface/monitor-traffic', [
        `=interface=${interfaceName}`,
        '=once='
      ]);
      return traffic[0];
    } catch (err) {
      throw new Error(`Failed to monitor traffic: ${err.message}`);
    }
  }

  async kickUser({ routerId, username }) {
    const conn = await this.getConnection(routerId);
    try {
      // Kick from PPP
      const pppActive = await conn.write('/ppp/active/print', [`?name=${username}`]);
      for (const connDetail of pppActive) {
        await conn.write('/ppp/active/remove', [`=.id=${connDetail['.id']}`]);
      }

      // Kick from Hotspot
      const hsActive = await conn.write('/ip/hotspot/active/print', [`?user=${username}`]);
      for (const connDetail of hsActive) {
        await conn.write('/ip/hotspot/active/remove', [`=.id=${connDetail['.id']}`]);
      }
      return true;
    } catch (err) {
      throw new Error(`Failed to kick user: ${err.message}`);
    }
  }

  async syncNASConfig(routerId) {
      // implementation stub
      return true;
  }
}

module.exports = new MikroTikService();
