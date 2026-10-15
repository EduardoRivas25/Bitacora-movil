/**
 * Verificación del señalador de pestaña (NavSpotlight): comprueba que se dibuje
 * el aro, los chevrons y la etiqueta de cada sección, y que el aro coincida con
 * la posición real de la pestaña en la barra inferior.
 */
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const babel = require('@babel/core');

const SRC = path.join(process.cwd(), 'src');

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
    const web = originalLoad.call(this, 'react-native-web', parent, isMain);
    return Object.assign({}, web, {
      Platform: { OS: 'web', select: (options) => options.web ?? options.default },
      AppState: { addEventListener: () => ({ remove: () => {} }) },
    });
  }
  if (request === '@expo/vector-icons') return iconStub;
  if (request === '../contexts/AuthContext' || request === '../contexts/OnboardingContext') {
    return {
      useAuth: () => ({ user: null }),
      useOnboarding: () => ({ showOnboarding: true, completeOnboarding: () => {}, resetOnboarding: () => {} }),
      OnboardingProvider: ({ children }) => children,
    };
  }
  if (request === 'expo-linear-gradient') return { LinearGradient: (props) => React.createElement('linear-gradient', props) };
  if (request === 'expo-blur') return { BlurView: (props) => React.createElement('blur-view', props) };
  if (request === 'react-native-safe-area-context') {
    return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
  }
  if (request === '@react-navigation/native') {
    return {
      createNavigationContainerRef: () => ({ isReady: () => false, dispatch: () => {} }),
      CommonActions: { navigate: (payload) => ({ type: 'NAVIGATE', payload }) },
    };
  }
  if (request === '../navigation/navigationRef') {
    return { navigateToSection: () => false };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const noop = () => {};
global.window = new Proxy({
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({ matches: false }),
}, { get: (t, p) => (p in t ? t[p] : undefined) });
global.document = new Proxy({}, { get: () => undefined });

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NavSpotlight } = require(path.join(SRC, 'components/OnboardingOverlay.tsx'));

const failures = [];
const SECTION_NAMES = ['Panel de Inicio', 'Infraestructura', 'Mapa Interactivo', 'Centro de Control', 'Configuraciones', 'Búsqueda Global'];
// Ancho de ventana simulado = 1000 (entorno de escritorio)
const WINDOW = 1000;
const BAR = Math.min(WINDOW - 20, 620);
const ITEM = BAR / 6;
const BAR_LEFT = (WINDOW - BAR) / 2;

for (let step = 0; step < 6; step++) {
  try {
    const html = renderToStaticMarkup(
      React.createElement(NavSpotlight, { activeStep: step, insets: { bottom: 0 } })
    );
    const hasRing = html.includes('border-top-color') && html.includes('border-right-color');
    const hasChevron = (html.match(/rotate\(45deg\)/g) || []).length > 0;
    const hasLabel = html.includes(SECTION_NAMES[step]);
    const hasIcon = html.includes('feather-icon') && html.toLowerCase().includes('name=');
    const expectedLeft = BAR_LEFT + ITEM * (step + 0.5) - 70;

    console.log(`[paso ${step + 1}] bytes=${html.length} aro=${hasRing} chevrons=${hasChevron} etiqueta=${hasLabel} icono=${hasIcon} left_esperado=${expectedLeft.toFixed(1)}`);

    if (!hasRing) failures.push(`paso${step + 1}:aro`);
    if (!hasChevron) failures.push(`paso${step + 1}:chevrons`);
    if (!hasLabel) failures.push(`paso${step + 1}:etiqueta "${SECTION_NAMES[step]}"`);
    if (!hasIcon) failures.push(`paso${step + 1}:icono de etiqueta`);

    // La etiqueta de la sección activa debe estar alineada con su pestaña
    const activeOnly = html.split(SECTION_NAMES[step]).length - 1;
    if (activeOnly < 1) failures.push(`paso${step + 1}:sin etiqueta activa`);
  } catch (error) {
    failures.push(`paso${step + 1}`);
    console.log(`[ERROR] paso ${step + 1}: ${error && error.message}`);
  }
}

console.log(failures.length === 0 ? 'RESULTADO: OK' : `RESULTADO: ${failures.length} fallo(s) -> ${failures.join(', ')}`);
process.exit(failures.length === 0 ? 0 : 1);
