export const ADMIN_TOKEN_KEY = 'portfolio-admin-token'

/** 读取管理后台 token；隐私模式或禁用存储时返回空字符串。 */
export function readToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
