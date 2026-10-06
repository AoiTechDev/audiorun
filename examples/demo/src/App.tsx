import { useRef, useState } from 'react'
import './App.css'
import { PlaybackEngine } from 'audiorun'
function App() {

  const engine = useRef(new PlaybackEngine())

  const [file, setFile] = useState(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files[0]
    setFile(f)
    engine.current.attach(f)
  }

  console.log(file)
  return <div>
    <button onClick={() => engine.current.play()}>play</button>
    <input type='file' onChange={onFileChange} />
  </div>
}

export default App
