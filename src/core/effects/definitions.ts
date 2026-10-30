import type { EffectDefinition, EffectKind } from '@/types/effect'

const shaderParam = (name: string): string => `__P${name}__`

const definitions: EffectDefinition[] = [
  {
    kind: 'brightness',
    label: 'Brightness',
    params: [
      { name: 'amount', label: 'Amount', min: -1, max: 1, step: 0.01, default: 0, animatable: true },
    ],
    defaults: { amount: 0 },
    fragment: `color.rgb += ${shaderParam('amount')};`,
  },
  {
    kind: 'contrast',
    label: 'Contrast',
    params: [
      { name: 'amount', label: 'Amount', min: 0, max: 3, step: 0.01, default: 1, animatable: true },
    ],
    defaults: { amount: 1 },
    fragment: `color.rgb = (color.rgb - 0.5) * ${shaderParam('amount')} + 0.5;`,
  },
  {
    kind: 'saturation',
    label: 'Saturation',
    params: [
      { name: 'amount', label: 'Amount', min: 0, max: 3, step: 0.01, default: 1, animatable: true },
    ],
    defaults: { amount: 1 },
    fragment: `{
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = mix(vec3(luma), color.rgb, ${shaderParam('amount')});
    }`,
  },
  {
    kind: 'hue',
    label: 'Hue Rotate',
    params: [
      { name: 'degrees', label: 'Degrees', min: -180, max: 180, step: 1, default: 0, animatable: true },
    ],
    defaults: { degrees: 0 },
    fragment: `{
      float a = radians(${shaderParam('degrees')});
      float c = cos(a);
      float s = sin(a);
      mat3 m = mat3(
        0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s,
        0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s,
        0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s
      );
      color.rgb = clamp(m * color.rgb, 0.0, 1.0);
    }`,
  },
  {
    kind: 'blur',
    label: 'Blur',
    params: [
      { name: 'radius', label: 'Radius', min: 0, max: 24, step: 0.1, default: 0, animatable: true },
    ],
    defaults: { radius: 0 },
    fragment: `{
      vec2 texel = 1.0 / u_resolution;
      float r = ${shaderParam('radius')};
      vec4 acc = vec4(0.0);
      float total = 0.0;
      for (int i = -4; i <= 4; i++) {
        float w = exp(-float(i * i) / 8.0);
        acc += texture(u_texture, uv + vec2(float(i) * texel.x * r, 0.0)) * w;
        total += w;
      }
      color = acc / total;
    }`,
  },
  {
    kind: 'sharpen',
    label: 'Sharpen',
    params: [
      { name: 'amount', label: 'Amount', min: 0, max: 2, step: 0.01, default: 0.4, animatable: true },
    ],
    defaults: { amount: 0.4 },
    fragment: `{
      vec2 texel = 1.0 / u_resolution;
      vec4 north = texture(u_texture, uv + vec2(0.0, -texel.y));
      vec4 south = texture(u_texture, uv + vec2(0.0, texel.y));
      vec4 east = texture(u_texture, uv + vec2(texel.x, 0.0));
      vec4 west = texture(u_texture, uv + vec2(-texel.x, 0.0));
      vec4 lap = color * 4.0 - north - south - east - west;
      color.rgb += lap.rgb * ${shaderParam('amount')};
    }`,
  },
  {
    kind: 'vignette',
    label: 'Vignette',
    params: [
      { name: 'amount', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.4, animatable: true },
      { name: 'softness', label: 'Softness', min: 0.01, max: 1, step: 0.01, default: 0.5, animatable: false },
    ],
    defaults: { amount: 0.4, softness: 0.5 },
    fragment: `{
      float d = distance(uv, vec2(0.5));
      float v = smoothstep(0.5, ${shaderParam('softness')} * 0.5, d);
      color.rgb *= mix(1.0, v, ${shaderParam('amount')});
    }`,
  },
  {
    kind: 'grain',
    label: 'Film Grain',
    params: [
      { name: 'amount', label: 'Amount', min: 0, max: 1, step: 0.01, default: 0.08, animatable: true },
    ],
    defaults: { amount: 0.08 },
    fragment: `{
      float n = fract(sin(dot(uv * u_resolution + u_time, vec2(12.9898, 78.233))) * 43758.5453);
      color.rgb += (n - 0.5) * ${shaderParam('amount')};
    }`,
  },
  {
    kind: 'chromaticAberration',
    label: 'Chromatic Aberration',
    params: [
      { name: 'amount', label: 'Amount', min: 0, max: 0.05, step: 0.001, default: 0.005, animatable: true },
    ],
    defaults: { amount: 0.005 },
    fragment: `{
      vec2 dir = uv - vec2(0.5);
      float a = ${shaderParam('amount')};
      color.r = texture(u_texture, uv + dir * a).r;
      color.b = texture(u_texture, uv - dir * a).b;
    }`,
  },
  {
    kind: 'pixelate',
    label: 'Pixelate',
    params: [
      { name: 'size', label: 'Size', min: 1, max: 128, step: 1, default: 8, animatable: true },
    ],
    defaults: { size: 8 },
    fragment: `{
      vec2 px = ${shaderParam('size')} / u_resolution;
      vec2 snapped = floor(uv / px) * px + px * 0.5;
      color = texture(u_texture, snapped);
    }`,
  },
  {
    kind: 'glow',
    label: 'Glow',
    params: [
      { name: 'amount', label: 'Amount', min: 0, max: 2, step: 0.01, default: 0.5, animatable: true },
      { name: 'threshold', label: 'Threshold', min: 0, max: 1, step: 0.01, default: 0.6, animatable: false },
    ],
    defaults: { amount: 0.5, threshold: 0.6 },
    fragment: `{
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      float mask = smoothstep(${shaderParam('threshold')}, 1.0, luma);
      color.rgb += color.rgb * mask * ${shaderParam('amount')};
    }`,
  },
  {
    kind: 'colorGrade',
    label: 'Color Grade',
    params: [
      { name: 'lift', label: 'Lift', min: -0.5, max: 0.5, step: 0.01, default: 0, animatable: true },
      { name: 'gamma', label: 'Gamma', min: 0.2, max: 3, step: 0.01, default: 1, animatable: true },
      { name: 'gain', label: 'Gain', min: 0, max: 3, step: 0.01, default: 1, animatable: true },
    ],
    defaults: { lift: 0, gamma: 1, gain: 1 },
    fragment: `{
      color.rgb = pow(max(color.rgb + ${shaderParam('lift')}, 0.0), vec3(1.0 / ${shaderParam('gamma')}));
      color.rgb *= ${shaderParam('gain')};
    }`,
  },
]

export const effectDefinitions: Record<EffectKind, EffectDefinition> = definitions.reduce(
  (acc, definition) => {
    acc[definition.kind] = definition
    return acc
  },
  {} as Record<EffectKind, EffectDefinition>,
)

export const listEffectDefinitions = (): EffectDefinition[] => definitions
