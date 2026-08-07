// AES-GCM + PBKDF2 によるDMメディアの復号ユーティリティ
// アップロード時(Node.jsのcrypto-node.js)と対になる、ブラウザ側の復号専用版

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

/**
 * salt(16) + iv(12) + 暗号文 の形式のArrayBufferを復号する
 */
export async function decryptToBlob(encryptedArrayBuffer, password, mimeType) {
  const buffer = new Uint8Array(encryptedArrayBuffer);
  const salt = buffer.slice(0, 16);
  const iv = buffer.slice(16, 28);
  const ciphertext = buffer.slice(28);

  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new Blob([decrypted], { type: mimeType || 'application/octet-stream' });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
