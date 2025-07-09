import { useState, useEffect } from "react"

const OptionsIndex = () => {
  const [apiKey, setApiKey] = useState("")
  const [targetLang, setTargetLang] = useState("zh-CHS")

  const handleSave = () => {
    // 保存设置到 chrome.storage
    chrome.storage.sync.set({
      apiKey: apiKey,
      targetLang: targetLang
    }, () => {
      alert("设置已保存！")
    })
  }

  const handleLoad = () => {
    // 从 chrome.storage 加载设置
    chrome.storage.sync.get(["apiKey", "targetLang"], (result) => {
      setApiKey(result.apiKey || "")
      setTargetLang(result.targetLang || "zh-CHS")
    })
  }

  // 页面加载时读取设置
  useEffect(() => {
    handleLoad()
  }, [])

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>翻译插件设置</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          API 密钥（可选）:
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="输入你的翻译API密钥"
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          目标语言:
        </label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        >
          <option value="zh-CHS">简体中文</option>
          <option value="zh-CHT">繁体中文</option>
          <option value="en">英语</option>
          <option value="ja">日语</option>
          <option value="ko">韩语</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        保存设置
      </button>
    </div>
  )
}

export default OptionsIndex 