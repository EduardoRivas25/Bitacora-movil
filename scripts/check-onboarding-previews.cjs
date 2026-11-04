/**
 * Verificación temporal: renderiza en Node (renderToStaticMarkup) las seis
 * vistas previas y la tarjeta del tutorial para detectar errores de ejecución
 * que el navegador headless no puede reportar en este entorno.
 */
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const babel = require('@babel/core');

const SRC = path.join(process.cwd(), 'src');

/* ── 1. Hook de Babel para archivos TS/TSX del proyecto ── */
function transform(code, filename) {
  return babel.transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: 'module',
    presets: [[require.resolve('@babel/preset-typescript'), { isTSX: true, allExtensions: true }]],
    plugins: [
      [require.resolve('@babel/plugin-transform-modules-commonjs'), { loose: true }],
      [require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'classic' }],
    ],
  }).code;
}

Module._extensions['.tsx'] = function (module, filename) {
  module._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename);
};
Module._extensions['.ts'] = Module._extensions['.tsx'];
Module._extensions['.cjs'] = Module._extensions['.js'];

/* ── 2. Shims de módulos nativos / web-only ── */
const iconStub = new Proxy({ __esModule: true }, {
  get: (target, prop) => {
    if (prop === '__esModule') return true;
    if (prop === 'glyphMap') return {};
    return (props) => React.createElement('feather-icon', { ...props, name: prop });
  },
});

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'react-native') {
    // react-native 0.86 no se puede requerir en Node (Flow/ESM); usamos react-native-web
    const web = originalLoad.call(this, 'react-native-web', parent, isMain);
    return Object.assign({}, web, {
      Platform: { OS: 'web', select: (options) => options.web ?? options.default },
      AppState: { addEventListener: () => ({ remove: () => {} }) },
    });
  }
  if (request === '@expo/vector-icons') return iconStub;
  if (request === '../contexts/AuthContext' || request === '../contexts/OnboardingContext') {
    // El onboarding solo necesita el usuario y las acciones del tutorial
    return {
      useAuth: () => ({ user: { id: 'dev', email: 'eduardo@bitacora.dev', profile: { name: 'Eduardo Rivas' } } }),
      useOnboarding: () => ({ showOnboarding: true, completeOnboarding: () => {}, resetOnboarding: () => {} }),
      OnboardingProvider: ({ children }) => children,
    };
  }
  if (request === 'expo-blur') return { BlurView: (props) => React.createElement('blur-view', props) };
  if (request === 'expo-linear-gradient') return { LinearGradient: (props) => React.createElement('linear-gradient', props) };
  if (request === 'react-native-safe-area-context') {
    return {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      SafeAreaProvider: ({ children }) => children,
    };
  }
  if (request === '@react-navigation/native') {
    // Solo se necesita para cargar navigationRef; el efecto no corre en SSR
    return {
      createNavigationContainerRef: () => ({ isReady: () => false, dispatch: () => {} }),
      CommonActions: { navigate: (payload) => ({ type: 'NAVIGATE', payload }) },
    };
  }
  if (request === '@react-native-async-storage/async-storage') {
    return { default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, __esModule: true };
  }
  return originalLoad.call(this, request, parent, isMain);
};

/* ── 3. Entorno de navegador mínimo ── */
const noop = () => {};
global.window = new Proxy({
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  location: { search: '', href: 'http://localhost/' },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
}, { get: (t, p) => (p in t ? t[p] : undefined) });
global.document = new Proxy({
  createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
  getElementById: () => null,
  head: { appendChild: noop },
  documentElement: { classList: { add: noop, remove: noop } },
}, { get: (t, p) => (p in t ? t[p] : undefined) });

/* ── 4. Render ── */
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { PreviewMock, PREVIEW_BASE_WIDTH } = require(path.join(SRC, 'components/OnboardingPreviews.tsx'));

const SCREENS = ['dashboard', 'infrastructure', 'map', 'control', 'config', 'search'];
const ACCENTS = ['#34D399', '#60A5FA', '#F472B6', '#FBBF24', '#A78BFA', '#FB923C'];
const failures = [];

/* 4a. Las seis vistas previas, una por una */
for (let index = 0; index < SCREENS.length; index++) {
  try {
    const html = renderToStaticMarkup(
      React.createElement(PreviewMock, {
        screen: SCREENS[index],
        accent: ACCENTS[index],
        maxWidth: PREVIEW_BASE_WIDTH,
      })
    );
    const ok = html.length > 400 && html.includes('bitacora');
    console.log(`${ok ? '[ok]   ' : '[FALLA]'} vista previa "${SCREENS[index]}" -> ${html.length} bytes`);
    if (!ok) failures.push(`preview:${SCREENS[index]}`);
  } catch (error) {
    failures.push(`preview:${SCREENS[index]}`);
    console.log(`[ERROR] vista previa "${SCREENS[index]}": ${error && error.message}`);
    console.log(String(error && error.stack).split('\n').slice(0, 6).join('\n'));
  }
}

/* 4b. La tarjeta del tutorial, paso por paso */
try {
  const { TutorialCard } = require(path.join(SRC, 'components/OnboardingOverlay.tsx'));
  const Animated = require('react-native-web').Animated;

  for (let step = 0; step < 6; step++) {
    const html = renderToStaticMarkup(
      React.createElement(TutorialCard, {
        step,
        visible: true,
        userName: 'Eduardo',
        fadeContent: new Animated.Value(1),
        slideContent: new Animated.Value(0),
        onNext: noop,
        onPrev: noop,
        onSkip: noop,
      })
    );
    console.log(`[ok]   tutorial paso ${step + 1} -> ${html.length} bytes`);

    const required = [`PASO ${step + 1} DE 6`, 'Omitir tutorial'];
    if (step === 0) required.push('Panel de Inicio', '¡Bienvenido, Eduardo!');
    if (step === 3) required.push('Centro de Control');
    if (step === 5) required.push('Búsqueda Global', 'Comenzar');
    if (step < 5) required.push('Siguiente');
    if (step > 0) required.push('Anterior');

    for (const check of required) {
      if (!html.includes(check)) {
        failures.push(`paso${step + 1}:${check}`);
        console.log(`   FALTA "${check}" en el paso ${step + 1}`);
      }
    }
  }
} catch (error) {
  failures.push('tutorial-card');
  console.log(`[ERROR] tarjeta del tutorial: ${error && error.message}`);
  console.log(String(error && error.stack).split('\n').slice(0, 8).join('\n'));
}

setTimeout(() => {
  console.log(failures.length === 0 ? 'RESULTADO: OK' : `RESULTADO: ${failures.length} fallo(s) -> ${failures.join(', ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
}, 300);
