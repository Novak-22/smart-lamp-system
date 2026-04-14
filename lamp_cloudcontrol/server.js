import express from 'express';
import mqtt from 'mqtt';
import { randomUUID } from 'crypto';

const app = express();
app.use(express.json());

// ==================== 配置 ====================
const AUTH_TOKEN = process.env.SMART_LAMP_AUTH_TOKEN || 'eyJhbGciOiJIUzUxMiJ9.eyJhcHAiOiJMSUdIVF9BUFAiLCJzdWIiOm51bGwsInJvbGUiOiJVU0VSIiwiaGVhZEltZyI6bnVsbCwiY3JlYXRlZCI6MTc3NTgwODc4NjE5Nywic291cmNlIjoiQVBQIiwidmVyc2lvbiI6MzcyMDg5ODExOTc3NTc0ODA5NywibmFtZSI6bnVsbCwiaWQiOiI0ODMxNDIzNzI1ODQzMzQ1ODY0IiwidXNlclR5cGUiOiJVU0VSIiwiZW5jIjp0cnVlLCJleHAiOjE3NzY0MTM1ODYsInN0YXR1cyI6IkFDVElWRSJ9._u_SPUnfdVGcscp1Uw8ZXHeHbE4TIZTU0Cr54LmOayo-zyPN7GdyndddENYRkpqNDFgb-_lfUIB5fwtGmmRJeA';
const DEVICE_ID = 'SCCHI-f8e19ced467d77a1eba05f4246e2f8cc';
const SIGNAL_TOPIC = `senselink/company/1/device/${DEVICE_ID}/signal`;
const STATUS_TOPIC = `senselink/company/1/device/${DEVICE_ID}/status`;
const MQTT_URL = `wss://sensejupiter-test.sensetime.com/mqtt4?authToken=${encodeURIComponent(AUTH_TOKEN)}`;
const FILESERVER_BASE = 'https://sensejupiter-test.sensetime.com';
const FILESERVER_SOURCE = process.env.SMART_LAMP_FILESERVER_SOURCE || 'APP';

// ==================== 状态 ====================
let brightness = 2;   // 0-4
let temperature = 5; // 0-10
let volume = 5;       // 0-10
let isOn = false;

// ==================== MQTT ====================
let mqttClient = null;
const pendingPhotoRequests = new Map(); // seq → { resolve, reject, timer }

function getClient() {
  if (!mqttClient) {
    console.log('[MQTT] creating new client, connecting to', MQTT_URL);
    mqttClient = mqtt.connect(MQTT_URL, {
      protocolId: 'MQTT',
      protocolVersion: 4,
      connectTimeout: 10000,
      keepalive: 30,
      clean: true,
      clientId: `lamp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      rejectUnauthorized: false,
    });
    mqttClient.on('error', (err) => console.error('[MQTT]', err.message));
    mqttClient.on('connect', () => console.log('[MQTT] connected'));
    mqttClient.on('offline', () => console.log('[MQTT] offline'));
    mqttClient.on('message', async (topic, payload) => {
      console.log('[MQTT] message on topic:', topic);
      if (topic !== STATUS_TOPIC) return;
      try {
        const status = JSON.parse(payload.toString());
        console.log('[MQTT] status received:', JSON.stringify(status));
        const { seq, data } = status;
        if (!seq) { console.log('[MQTT] no seq in status'); return; }
        console.log('[MQTT] seq:', seq, 'pendingPhotoRequests has seq:', pendingPhotoRequests.has(seq));
        if (!pendingPhotoRequests.has(seq)) return;
        const { resolve, reject, timer } = pendingPhotoRequests.get(seq);
        clearTimeout(timer);
        pendingPhotoRequests.delete(seq);
        // 提取 skill-take-photo 结果
        const skillData = data && data['skill-take-photo'];
        if (!skillData) {
          reject(new Error('status data missing skill-take-photo'));
          return;
        }
        // 调用 fileserver 接口获取图片 URL
        const { bucket, objectname, result, filename, file_id, url } = skillData;
        console.log('[MQTT] full skillData:', JSON.stringify(skillData));
        const photoUrl = url || (bucket && objectname
          ? `${FILESERVER_BASE}/l1/fileserver/v1/view?bucket=${encodeURIComponent(bucket)}&objectname=${encodeURIComponent(objectname)}`
          : null);
        console.log('[MQTT] resolving photo result:', { result, bucket, objectname, filename, file_id, url, photoUrl });
        resolve({ result, bucket, objectname, photoUrl });
      } catch (e) {
        console.error('[MQTT] parse status error:', e.message);
      }
    });
    mqttClient.subscribe(STATUS_TOPIC, { qos: 1 }, (err) => {
      if (err) console.error('[MQTT] subscribe status error:', err.message);
      else console.log('[MQTT] subscribed to', STATUS_TOPIC);
    });
  }
  return mqttClient;
}

function buildMsg(event, value) {
  return {
    timestamp: Math.floor(Date.now() / 1000),
    seq: randomUUID(),
    signal: 7,
    data: { event, value }
  };
}

function publish(msg) {
  return new Promise((resolve, reject) => {
    console.log('[MQTT] publishing to', SIGNAL_TOPIC, ':', JSON.stringify(msg));
    getClient().publish(SIGNAL_TOPIC, JSON.stringify(msg), { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ==================== API ====================

// GET /api/lamp/status
app.get('/api/lamp/status', (req, res) => {
  res.json({
    success: true,
    data: { isOn, brightness, temperature, volume }
  });
});

// POST /api/lamp/switch
app.post('/api/lamp/switch', async (req, res) => {
  const { on } = req.body;
  isOn = !!on;
  try {
    await publish(buildMsg('switch_device_onoff', isOn ? 1 : 0));
    res.json({ success: true, message: isOn ? '灯已打开' : '灯已关闭', isOn });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/brightness
app.post('/api/lamp/brightness', async (req, res) => {
  const { action, value } = req.body;
  if (action === 'up') brightness = Math.min(5, brightness + 1);
  else if (action === 'down') brightness = Math.max(1, brightness - 1);
  else if (action === 'set') brightness = Math.max(1, Math.min(5, parseInt(value, 10) || 0));
  else return res.status(400).json({ success: false, error: 'action must be: up, down, set' });

  try {
    await publish(buildMsg('adjust_brightness', { brightness_mode: 1, brightness, temperature }));
    res.json({ success: true, message: `亮度已调整为 ${brightness}`, brightness, temperature });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/temperature
app.post('/api/lamp/temperature', async (req, res) => {
  const { value } = req.body;
  temperature = Math.max(0, Math.min(10, parseInt(value, 10) || 0));
  try {
    await publish(buildMsg('adjust_brightness', { brightness_mode: 1, brightness, temperature }));
    res.json({ success: true, message: `色温已调整为 ${temperature}`, temperature });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/volume
app.post('/api/lamp/volume', async (req, res) => {
  const { action, value } = req.body;
  if (action === 'up') volume = Math.min(10, volume + 1);
  else if (action === 'down') volume = Math.max(0, volume - 1);
  else if (action === 'set') volume = Math.max(0, Math.min(10, parseInt(value, 10) || 0));
  else return res.status(400).json({ success: false, error: 'action must be: up, down, set' });

  try {
    await publish(buildMsg('adjust_volume', volume));
    res.json({ success: true, message: `音量已调整为 ${volume}`, volume });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/tts — 文本转语音
app.post('/api/lamp/tts', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'content is required' });

  try {
    await publish(buildMsg('claw-skill', { skill: 'skill-tts-chinese', content }));
    res.json({ success: true, message: 'TTS 指令已下发', content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lamp/photo — 触发拍照并直接返回图片
app.post('/api/lamp/photo', async (req, res) => {
  const msg = buildMsg('claw-skill', { skill: 'skill-take-photo' });
  const seq = msg.seq;
  console.log('[API] /api/lamp/photo called, seq:', seq);

  try {
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingPhotoRequests.delete(seq);
        reject(new Error('等待设备响应超时（30s）'));
      }, 30000);
      pendingPhotoRequests.set(seq, { resolve, reject, timer });
      publish(msg).catch(reject); // 只 catch publish 错误，不提前 resolve
    });

    if (!result.photoUrl) {
      return res.status(500).json({ success: false, error: '拍照成功但未返回 photoUrl' });
    }

    // 直接从 /view 接口获取图片数据（返回二进制图片）
    const fetchRes = await fetch(result.photoUrl, {
      headers: {
        'AUTH-TOKEN': AUTH_TOKEN,
        'SOURCE': FILESERVER_SOURCE,
      },
    });

    if (!fetchRes.ok) {
      const errorText = await fetchRes.text();
      return res.status(502).json({
        success: false,
        error: `fileserver 拉图失败: ${fetchRes.status}`,
        detail: errorText,
        photoUrl: result.photoUrl,
      });
    }

    const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = Buffer.from(await fetchRes.arrayBuffer());
    console.log('[API] fileserver response content-type:', contentType);
    console.log('[API] fileserver response size:', imageBuffer.length);
    console.log('[API] fileserver first 20 bytes hex:', imageBuffer.slice(0, 20).toString('hex'));

    // 保存图片到当前目录
    const filename = `photo-${Date.now()}.jpg`;
    await import('node:fs/promises').then(async (fs) => {
      await fs.writeFile(filename, imageBuffer);
      console.log('[API] photo saved to:', filename, `(${imageBuffer.length} bytes)`);
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(imageBuffer.length));
    res.send(imageBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    pendingPhotoRequests.delete(seq);
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lamp CloudControl running on http://localhost:${PORT}`);
});
