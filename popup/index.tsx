import { useState } from "react"

function IndexPopup() {
  const [count, setCount] = useState("")

  const handleIncrement = () => {
    setCount(count + 1)
  }

  return (
    <div 
      style={{
        "padding":16,
        "width":300,
        "height":400
      }}
    >
    <h1 style={{color:"blue"}}>现代化插件</h1>
    <p>the number is {count}</p>
    <button onClick={handleIncrement} style={{display: "block", margin: "32px auto"}}>click</button>
    </div>
  )
}

export default IndexPopup
