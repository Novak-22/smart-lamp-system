const fs = await import('fs');

const PORT = process.env.PORT || 3001;
const URL = `http://localhost:${PORT}/api/lamp/photo`;

console.log('Calling', URL, '...');

try {
  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const contentType = response.headers.get('content-type');
  console.log('Status:', response.status);
  console.log('Content-Type:', contentType);

  if (!response.ok) {
    const error = await response.json();
    console.error('Error:', error);
    process.exit(1);
  }

  // 获取图片二进制数据并保存
  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `photo-${Date.now()}.jpg`;
  fs.writeFileSync(filename, buffer);
  console.log('Photo saved to:', filename);
  console.log('Size:', buffer.byteLength, 'bytes');
} catch (err) {
  console.error('Request failed:', err.message);
  process.exit(1);
}
