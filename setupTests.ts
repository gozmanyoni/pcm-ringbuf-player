// Mock import.meta for ES modules
;(global as any).importMeta = {
  url: 'file:///test/file.js',
  env: {}
}

// Mock AudioWorkletNode
const MockAudioWorkletNode = class {
  connect() {}
  disconnect() {}
} as any

// Mock GainNode
const MockGainNode = class {
  gain: {
    value: number
    setTargetAtTime: (target: number, startTime: number, timeConstant: number) => void
  }

  constructor() {
    this.gain = {
      value: 1,
      setTargetAtTime: (target: number) => {
        this.gain.value = target
      },
    }
  }

  connect() {}
  disconnect() {}
} as any

// Mock AudioWorklet
const MockAudioWorklet = class {
  async addModule(_url: string) {
    return Promise.resolve()
  }
} as any

// Mock AudioContext
const MockAudioContext = class {
  sampleRate: number
  destination: any
  audioWorklet: any
  state: string
  currentTime: number

  constructor(options: any) {
    this.sampleRate = options?.sampleRate || 44100
    this.destination = {}
    this.audioWorklet = new MockAudioWorklet()
    this.state = 'running'
    this.currentTime = 0
  }

  createGain() {
    return new MockGainNode()
  }

  async close() {
    this.state = 'closed'
    return Promise.resolve()
  }
} as any

// Mock URL
const MockURL = class {
  href: string
  constructor(url: string, _base?: string) {
    this.href = url
  }
} as any

// Set up global mocks
Object.defineProperty(global, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
})

Object.defineProperty(global, 'AudioWorkletNode', {
  value: MockAudioWorkletNode,
  writable: true,
})

Object.defineProperty(global, 'GainNode', {
  value: MockGainNode,
  writable: true,
})

Object.defineProperty(global, 'URL', {
  value: MockURL,
  writable: true,
})