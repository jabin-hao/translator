import { handleTranslateRequest } from './translate'

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'translate') {
    handleTranslateRequest(msg.payload)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }))
    return true // 异步响应
  }
})