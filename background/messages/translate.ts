import type { PlasmoMessaging } from "@plasmohq/messaging"
import { bingTranslate } from '../translate/bing'
import { googleTranslate } from '../translate/google'
import { deeplTranslate } from '../translate/deepl'

// 超时工具
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('翻译超时')), ms)
    promise.then((val) => {
      clearTimeout(timer)
      resolve(val)
    }, (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

const ENGINES = ["bing","google", "deepl"];

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text, from = 'auto', to = 'zh-CN', engine = 'bing' } = req.body
  // 优先用请求的 engine，失败/超时自动切换
  const engines = [engine, ...ENGINES.filter(e => e !== engine)]
  let lastError = ''
  for (const eng of engines) {
    try {
      let result: string
      if (eng === 'bing') {
        result = await withTimeout(bingTranslate(text, from, to), 5000)
      } else if (eng === 'google') {
        result = await withTimeout(googleTranslate(text, from, to), 5000)
      } else if (eng === 'deepl') {
        result = await withTimeout(deeplTranslate(text, from, to), 5000)
      } else {
        throw new Error('不支持的翻译引擎: ' + eng)
      }
      return res.send({ result, engine: eng })
    } catch (error) {
      lastError = error.message
    }
  }
  res.send({ error: lastError || '所有翻译引擎均不可用' })
}

export default handler 