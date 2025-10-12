// 简单本地存储封装：以数组为主
const getArray = (key) => {
  try { return wx.getStorageSync(key) || []; } catch (e) { return []; }
};

const setArray = (key, arr) => {
  try { wx.setStorageSync(key, arr || []); } catch (e) {}
};

const pushToArray = (key, item) => {
  const arr = getArray(key);
  arr.unshift(item);
  setArray(key, arr);
  return arr;
};

const upsertById = (key, item, idField = '_id') => {
  const arr = getArray(key);
  const idx = arr.findIndex(i => i[idField] === item[idField]);
  if (idx >= 0) arr[idx] = item; else arr.unshift(item);
  setArray(key, arr);
  return arr;
};

const removeById = (key, id, idField = '_id') => {
  const arr = getArray(key).filter(i => i[idField] !== id);
  setArray(key, arr);
  return arr;
};

module.exports = {
  getArray,
  setArray,
  pushToArray,
  upsertById,
  removeById,
};


