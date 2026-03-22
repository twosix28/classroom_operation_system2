// 사이트의 커스텀 RSA 구현을 Node.js에서 실행
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import vm from 'vm'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createCryptoContext() {
  const ctx = vm.createContext({
    Math,
    String,
    Array,
    parseInt,
    parseFloat,
    isNaN,
    console,
  })

  const files = ['BigInt.js', 'Barrett.js', 'RSA.js', 'logAddon.js']
  for (const file of files) {
    const code = readFileSync(path.join(__dirname, file), 'utf-8')
    vm.runInContext(code, ctx)
  }

  return ctx
}

// 싱글턴 컨텍스트
let _ctx = null

function getCtx() {
  if (!_ctx) _ctx = createCryptoContext()
  return _ctx
}

/**
 * 사이트와 동일한 방식으로 RSA 암호화
 * base64encode(plainText) → encryptedString(key, ...) → hex
 */
export function ktbizEncrypt(plainText, modulusHex, exponentHex) {
  const ctx = getCtx()

  // initKey와 동일하게 키 설정
  vm.runInContext(`
    setMaxDigits(131);
    var _key = new RSAKeyPair("${exponentHex}", "", "${modulusHex}");
    var _result = encryptedString(_key, base64encode(${JSON.stringify(plainText)}));
  `, ctx)

  return ctx._result
}
