// Monaco Editor 本地配置文件
window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    switch (label) {
      case 'typescript':
      case 'javascript':
        return '/monaco-editor/typescript.worker.js';
      case 'json':
        return '/monaco-editor/json.worker.js';
      case 'css':
      case 'scss':
      case 'less':
        return '/monaco-editor/css.worker.js';
      case 'html':
      case 'handlebars':
      case 'razor':
        return '/monaco-editor/html.worker.js';
      default:
        return '/monaco-editor/editor.worker.js';
    }
  }
};
