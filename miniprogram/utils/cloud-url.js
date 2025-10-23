/**
 * 云存储 URL 转换工具
 * 用途：批量转换 cloud:// URL 为临时 HTTPS URL
 */

/**
 * 批量转换 cloud:// URL 为 HTTPS URL
 * @param {Array<string>} fileIds - cloud:// URL 数组
 * @returns {Promise<Object>} - { 'cloud://xxx': 'https://xxx', ... }
 */
async function toHttpsBatch(fileIds = []) {
  // 过滤出有效的 cloud:// URL
  const list = fileIds
    .filter(url => url && typeof url === 'string' && url.startsWith('cloud://'))
    .map(url => url.trim());

  if (list.length === 0) {
    return {};
  }

  // 去重
  const uniqueList = [...new Set(list)];

  // 微信云存储 getTempFileURL 最多支持 50 个，需要分批
  const BATCH_SIZE = 50;
  const chunks = [];
  for (let i = 0; i < uniqueList.length; i += BATCH_SIZE) {
    chunks.push(uniqueList.slice(i, i + BATCH_SIZE));
  }

  const urlMap = {};

  try {
    for (const chunk of chunks) {
      const res = await wx.cloud.getTempFileURL({
        fileList: chunk
      });

      if (res.fileList && res.fileList.length > 0) {
        res.fileList.forEach(file => {
          // 只接受有效的 https 链接
          if (file.tempFileURL && file.tempFileURL.startsWith('https://')) {
            urlMap[file.fileID] = file.tempFileURL;
          } else if (file.tempFileURL && file.tempFileURL.startsWith('http://')) {
            // http 也接受（虽然不推荐）
            urlMap[file.fileID] = file.tempFileURL;
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ [云存储转换] 批量转换失败:', error);
  }

  return urlMap;
}

/**
 * 转换单个 cloud:// URL 为 HTTPS URL
 * @param {string} url - cloud:// URL
 * @returns {Promise<string>} - HTTPS URL 或原 URL
 */
async function toHttps(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('cloud://')) {
    return url || '';
  }

  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: [url]
    });

    if (res.fileList && res.fileList.length > 0) {
      const tempUrl = res.fileList[0].tempFileURL;
      if (tempUrl && (tempUrl.startsWith('https://') || tempUrl.startsWith('http://'))) {
        return tempUrl;
      }
    }
  } catch (error) {
    console.error('❌ [云存储转换] 单个转换失败:', error);
  }

  return url; // 转换失败，返回原URL
}

/**
 * 批量转换对象中的所有图片字段
 * @param {Object} obj - 要处理的对象
 * @param {Array<string>} fields - 需要转换的字段名数组
 * @returns {Promise<Object>} - 转换后的对象
 */
async function convertObjectFields(obj, fields = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // 收集所有需要转换的 URL
  const urlsToConvert = [];
  fields.forEach(field => {
    const value = obj[field];
    if (typeof value === 'string' && value.startsWith('cloud://')) {
      urlsToConvert.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(url => {
        if (typeof url === 'string' && url.startsWith('cloud://')) {
          urlsToConvert.push(url);
        }
      });
    }
  });

  if (urlsToConvert.length === 0) {
    return obj;
  }

  // 批量转换
  const urlMap = await toHttpsBatch(urlsToConvert);

  // 替换字段值
  fields.forEach(field => {
    const value = obj[field];
    if (typeof value === 'string' && urlMap[value]) {
      obj[field] = urlMap[value];
    } else if (Array.isArray(value)) {
      obj[field] = value.map(url => urlMap[url] || url);
    }
  });

  return obj;
}

module.exports = {
  toHttps,
  toHttpsBatch,
  convertObjectFields
};

