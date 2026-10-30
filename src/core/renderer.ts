/**
 * WebGL2 renderer. Keeps one program per effect combination by rebuilding the
 * fragment shader when the active effect list changes; shader compilation is
 * cached by a signature key so scrubbing does not recompile every frame.
 */
import type { RGBA, Rect } from '@/lib/math'
import type { EffectInstance } from '@/types/effect'
import { effectDefinitions } from './effects/definitions'

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
out vec2 v_uv;
uniform mat4 u_matrix;
void main() {
  v_uv = a_uv;
  gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
}`

const BASE_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_texture;
uniform float u_opacity;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_blur;
__PARAMS__
__BODY__
void main() {
  vec2 uv = v_uv;
  vec4 color = texture(u_texture, uv);
__APPLY__
  color.a *= u_opacity;
  outColor = color;
}`

export type RenderTarget = {
  texture: WebGLTexture
  width: number
  height: number
}

export type RenderOptions = {
  effects: EffectInstance[]
  opacity: number
  blur: number
  rect: Rect
  viewport: { width: number; height: number }
  time: number
  backgroundColor: RGBA
}

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${info ?? 'unknown error'}`)
  }
  return shader
}

export const buildFragmentSource = (effects: EffectInstance[]): string => {
  const active = effects
    .map((effect) => ({ effect, definition: effectDefinitions[effect.kind] }))
    .filter((entry) => Boolean(entry.definition))

  const params: string[] = []
  const body: string[] = []
  const apply: string[] = []

  active.forEach(({ effect, definition }, index) => {
    for (const param of definition.params) {
      const name = `u_${effect.kind}_${param.name}_${index}`
      params.push(`uniform float ${name};`)
      body.push(`float ${effect.kind}_${param.name}() { return ${name}; }`)
    }
    apply.push(definition.fragment.replace(/__P(\w+)__/g, (_, p) => `${effect.kind}_${p}()`))
  })

  return BASE_FRAGMENT.replace('__PARAMS__', params.join('\n'))
    .replace('__BODY__', body.join('\n'))
    .replace('__APPLY__', apply.join('\n'))
}

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext | null = null
  private programs = new Map<string, WebGLProgram>()
  private quad: WebGLBuffer | null = null
  private uvBuffer: WebGLBuffer | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  static isSupported(): boolean {
    if (typeof document === 'undefined') return false
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2'))
  }

  init(): boolean {
    if (this.gl) return true
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })
    if (!gl) return false
    this.gl = gl

    const quadData = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
    const uvData = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0])

    this.quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW)

    this.uvBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    return true
  }

  resize(width: number, height: number, dpr = 1): void {
    const gl = this.gl
    if (!gl) return
    const nextWidth = Math.max(1, Math.round(width * dpr))
    const nextHeight = Math.max(1, Math.round(height * dpr))
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth
      this.canvas.height = nextHeight
    }
    gl.viewport(0, 0, nextWidth, nextHeight)
  }

  private getProgram(effects: EffectInstance[]): WebGLProgram | null {
    const gl = this.gl
    if (!gl) return null
    const signature = effects.map((effect) => `${effect.kind}:${Object.keys(effect.values).join(',')}`).join('|')
    const cached = this.programs.get(signature)
    if (cached) {
      return cached
    }

    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER))
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, buildFragmentSource(effects)))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return null
    }
    this.programs.set(signature, program)
    return program
  }

  createTexture(source: TexImageSource, width: number, height: number): RenderTarget | null {
    const gl = this.gl
    if (!gl) return null
    const texture = gl.createTexture()
    if (!texture) return null
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    return { texture, width, height }
  }

  draw(target: RenderTarget | null, options: RenderOptions): void {
    const gl = this.gl
    if (!gl) return
    const program = this.getProgram(options.effects)
    if (!program) return

    gl.clearColor(
      options.backgroundColor.r,
      options.backgroundColor.g,
      options.backgroundColor.b,
      options.backgroundColor.a,
    )
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (!target) return

    gl.useProgram(program)

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const uvLocation = gl.getAttribLocation(program, 'a_uv')

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer)
    gl.enableVertexAttribArray(uvLocation)
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0)

    const { rect, viewport } = options
    const matrix = [
      (rect.width / viewport.width) * 2, 0, 0, 0,
      0, (rect.height / viewport.height) * 2, 0, 0,
      0, 0, 1, 0,
      ((rect.x + rect.width / 2) / viewport.width) * 2 - 1,
      -(((rect.y + rect.height / 2) / viewport.height) * 2 - 1),
      0, 1,
    ]
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_matrix'), false, new Float32Array(matrix))
    gl.uniform1f(gl.getUniformLocation(program, 'u_opacity'), options.opacity)
    gl.uniform1f(gl.getUniformLocation(program, 'u_blur'), options.blur)
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), options.time)
    gl.uniform2f(
      gl.getUniformLocation(program, 'u_resolution'),
      viewport.width,
      viewport.height,
    )

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, target.texture)
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0)

    options.effects.forEach((effect, index) => {
      const definition = effectDefinitions[effect.kind]
      if (!definition) return
      for (const param of definition.params) {
        const location = gl.getUniformLocation(program, `u_${effect.kind}_${param.name}_${index}`)
        gl.uniform1f(location, effect.values[param.name] ?? param.default)
      }
    })

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  readPixels(width: number, height: number): Uint8ClampedArray | null {
    const gl = this.gl
    if (!gl) return null
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return new Uint8ClampedArray(pixels.buffer)
  }

  dispose(): void {
    const gl = this.gl
    if (!gl) return
    for (const program of this.programs.values()) gl.deleteProgram(program)
    this.programs.clear()
    if (this.quad) gl.deleteBuffer(this.quad)
    if (this.uvBuffer) gl.deleteBuffer(this.uvBuffer)
    this.quad = null
    this.uvBuffer = null
    this.gl = null
  }
}
