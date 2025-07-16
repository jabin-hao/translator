import type { PlasmoMessaging } from "@plasmohq/messaging"
import { bingTranslate } from '../translate/bing'
import { googleTranslate } from '../translate/google'

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text, from = 'auto', to = 'zh-CN', engine = 'bing' } = req.body
  try {
    let result: string
    if (engine === 'bing') {
      result = await bingTranslate(text, from, to)
    } else if (engine === 'google') {
      result = await googleTranslate(text, from, to)
    } else {
      throw new Error('不支持的翻译引擎: ' + engine)
    }
    res.send({ result })
  } catch (error) {
    res.send({ error: error.message })
  }
}

export default handler 