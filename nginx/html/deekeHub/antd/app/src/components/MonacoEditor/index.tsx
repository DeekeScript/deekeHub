import React, { useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// 配置Monaco Editor使用本地文件
loader.config({
  paths: {
    vs: '/monaco-editor/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn'
    }
  }
});

// 使用 public/monaco-editor/config.js 提供的 worker 配置（不要禁用 worker）

// 定义组件属性类型
interface MonacoEditorProps {
  value: string;
  language: string;
  theme?: string;
  height?: number | string;
  width?: number;
  onChange: (value: string) => void;
  onShiftEnter?: () => void;
  onBlur?: (value: string) => void;
  onChangeLine?: () => void;
  enableIntelliSense?: boolean;
  typescriptFiles?: string[];
}

const MonacoEditor: React.FC<MonacoEditorProps> = (props) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);

  // 注册主题（在编辑器挂载前，确保首次打开即生效）
  const registerThemes = (m: typeof import('monaco-editor')) => {
    m.editor.defineTheme('eye-care-green', {
      base: 'vs', inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267F99', fontStyle: 'bold' },
        { token: 'function', foreground: '795E26' },
        { token: 'variable', foreground: '001080' },
      ],
      colors: {
        'editor.background': '#FFFDF0',
        'editorGutter.background': '#E8E8E8',
        'editorLineNumber.foreground': '#999',
        'editorLineNumber.activeForeground': '#555',
        'editor.selectionBackground': '#D4E6B8',
        'editorCursor.foreground': '#2D3748',
        'editorIndentGuide.background': '#E8E8E8',
      },
    });
    m.editor.defineTheme('eye-care-blue', {
      base: 'vs', inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267F99', fontStyle: 'bold' },
        { token: 'function', foreground: '795E26' },
      ],
      colors: {
        'editor.background': '#F0F8FF',
        'editorLineNumber.foreground': '#718096',
        'editor.selectionBackground': '#BEE3F8',
      },
    });
  };

  // 处理编辑器挂载
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 启用 Rhino 1.8 模式（以 ES5 为基线、补齐基础 lib）
    try {
      setupRhino18JavaScriptDefaults(monaco);
    } catch (e) {
      console.warn('设置 Rhino 1.8 JS 选项失败: ', e);
    }

    // 设置DeekeScript API
    setupDeekeScriptAPI(monaco).catch(error => {
      console.error('设置DeekeScript API失败:', error);
    });

    // 简化模型配置，让Monaco使用默认行为
    const model = editor.getModel();
    if (model) {
      console.log('编辑器模型已创建:', model.uri.toString());
    }

    // 设置编辑器选项
    editor.updateOptions({
      fontSize: 16,
      tabSize: 2,
      wordWrap: 'on',
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      suggest: {
        showKeywords: true, // 重新启用关键词提示，支持全局变量
        showSnippets: true,
        showFunctions: true,
        showConstructors: true,
        showFields: true,
        showVariables: true, // 重新启用变量提示，支持全局变量
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true, // 重新启用模块提示
        showProperties: true,
        showEvents: true,
        showOperators: false, // 禁用操作符提示
        showUnits: false, // 禁用单位提示
        showValues: false, // 禁用值提示
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showColors: false, // 禁用颜色提示
        showFiles: false, // 禁用文件提示
        showReferences: false, // 禁用引用提示
        showFolders: false, // 禁用文件夹提示
        showTypeParameters: true,
        showIssues: false, // 禁用问题提示
        showUsers: false, // 禁用用户提示
        showWords: false, // 禁用单词提示
      }
    });

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      props.onChange(value);
      runRhino18SyntaxScan(editor, monaco);
    });

    // 监听失焦事件
    editor.onDidBlurEditorText(() => {
      if (props.onBlur) {
        props.onBlur(editor.getValue());
      }
    });

    // 监听键盘事件
    editor.onKeyDown((e) => {
      if (e.shiftKey && e.keyCode === monaco.KeyCode.Enter) {
        if (props.onShiftEnter) {
          props.onShiftEnter();
        }
        e.preventDefault();
      }
    });

    // 首次运行 Rhino 1.8 语法扫描
    runRhino18SyntaxScan(editor, monaco);

    console.log('Monaco Editor 已初始化完成');
  };

  // 设置 Rhino 1.8 的 JS 语言服务默认项（以 ES5/无现代 lib 为主）
  const setupRhino18JavaScriptDefaults = (monaco: typeof import('monaco-editor')) => {
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowJs: true,
      // Rhino 1.8 在开启 ES6 模式下支持大量 ES2015 语法
      target: monaco.languages.typescript.ScriptTarget.ES2015,
      // 仅保留 ES5 标准库，避免引入浏览器 DOM 与内置 console 类型，console 由 DeekeScript 定义
      lib: ['es5'],
      noLib: false,
      allowNonTsExtensions: true,
      module: monaco.languages.typescript.ModuleKind.None,
      downlevelIteration: false,
      noEmit: true,
      skipLibCheck: true,
      checkJs: false,
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  };

  // Rhino 1.8 不支持的 ES6+ 语法快速扫描并打标
  const runRhino18SyntaxScan = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: typeof import('monaco-editor')
  ) => {
    const model = editor.getModel();
    if (!model) return;
    const text = model.getValue();

    const rules: Array<{ name: string; regex: RegExp; message: string }> = [
      // 模块语法（ES Modules）
      { name: 'import', regex: /(^|\n)\s*import\s+[^;]+;/, message: 'Rhino 1.8 默认不支持 ES Modules（import）。' },
      { name: 'export', regex: /(^|\n)\s*export\s+[^;]+;/, message: 'Rhino 1.8 默认不支持 ES Modules（export）。' },
      // ES2017 特性
      { name: 'async', regex: /(^|\n)\s*async\s+function\b|\basync\s*\(/, message: 'Rhino 1.8 不支持 async/await。' },
    ];

    const markers: monaco.editor.IMarkerData[] = [];
    rules.forEach((rule) => {
      let match: RegExpExecArray | null;
      const regex = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
      while ((match = regex.exec(text)) != null) {
        const start = match.index;
        const end = start + (match[0] ? match[0].length : 1);
        const startPos = model.getPositionAt(start);
        const endPos = model.getPositionAt(end);
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: rule.message + ' 参考 Rhino ES2015 支持表：' + 'https://mozilla.github.io/rhino/compat/engines.html',
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
          source: 'rhino-1.8',
        });
      }
    });

    monaco.editor.setModelMarkers(model, 'rhino-1.8', markers);
  };


  // 获取DeekeScript类型定义
  const getDeekeScriptTypes = (): string => {
    return `
declare global {
  // 全局函数类型定义
  function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;
  function clearTimeout(id: number): void;
  function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;
  function clearInterval(id: number): void;

  // UiSelector 类
  function UiSelector(simpleMode?: boolean): UiSelector;
  class UiSelector {
    text(text: string): UiSelector;
    textContains(text: string): UiSelector;
    textMatches(text: string): UiSelector;
    desc(desc: string): UiSelector;
    descContains(desc: string): UiSelector;
    descMatches(desc: string): UiSelector;
    className(className: string): UiSelector;
    id(id: string): UiSelector;
    bounds(left: number, top: number, right: number, bottom: number): UiSelector;
    clickable(bool: boolean): UiSelector;
    checked(bool: boolean): UiSelector;
    selected(bool: boolean): UiSelector;
    enabled(bool: boolean): UiSelector;
    scrollable(bool: boolean): UiSelector;
    checkable(bool: boolean): UiSelector;
    focusable(bool: boolean): UiSelector;
    focused(bool: boolean): UiSelector;
    editable(bool: boolean): UiSelector;
    isVisibleToUser(bool: boolean): UiSelector;
    filter(filter: (v: UiObject) => boolean): UiSelector;
    exists(): boolean;
    waitFindOne(): UiObject;
    find(): UiObjectArray;
    findBy(obj: UiSelector): UiObjectArray;
    findBy(timeout: number): UiObjectArray;
    findOne(): UiObject;
    findOnce(): UiObject;
    findOneBy(obj: UiSelector): UiObject;
    findOneBy(timeout: number): UiObject;
  }

  // 为数组访问提供更好的类型推断
  interface UiObjectArray extends Array<UiObject> {
    [index: number]: UiObject;
  }

  interface PointArray extends Array<Point> {
    [index: number]: Point;
  }

  interface TextAndRegionArray extends Array<TextAndRegion> {
    [index: number]: TextAndRegion;
  }

  interface RectArray extends Array<Rect> {
    [index: number]: Rect;
  }

  interface StringArray extends Array<string> {
    [index: number]: string;
  }

  // UiObject 接口
  interface UiObject {
    click(): boolean;
    longClick(): boolean;
    scrollForward(): boolean;
    scrollBackward(): boolean;
    setSelection(start: number, end: number): boolean;
    copy(): boolean;
    cut(): boolean;
    paste(): boolean;
    focus(): boolean;
    setText(text: string): boolean;
    find(obj: UiSelector): UiObjectArray;
    findOne(obj: UiSelector): UiObject;
    bounds(): Rect;
    text(): string;
    desc(): string;
    id(): string;
    children(): UiObject;
    getChildren(index: number): UiObject;
    length(): number;
    getChildCount(): number;
    parent(): UiObject;
    getDrawingOrder(): number;
    isSelected(): boolean;
    isLongClickable(): boolean;
    isClickable(): boolean;
    isEditable(): boolean;
    isFocusable(): boolean;
    isFocused(): boolean;
    isEnabled(): boolean;
    isPassword(): boolean;
    className(): string;
    getPackageName(): string;
    getHintText(): string;
    isScrollable(): boolean;
    isVisibleToUser(): boolean;
    isChecked(): boolean;
    isCheckable(): boolean;
  }

  // Rect 类
  class Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    constructor(left: number, top: number, right: number, bottom: number);
    height(): number;
    width(): number;
    centerX(): number;
    centerY(): number;
  }

  // Console 接口
  var console: Console;
  interface Console {
    log(...message: any[]): void;
    warn(...message: any[]): void;
    error(...message: any[]): void;
    info(...message: any[]): void;
    debug(...message: any[]): void;
    trace(...message: any[]): void;
    show(): void; // 显示日志窗口
    hide(): void; // 隐藏日志窗口
    setWindowSize(width: number, height: number): void; // 设置日志窗口大小
    setWindowPosition(x: number, y: number): void; // 设置日志窗口位置
    setBackgroundColor(color: number): void; // 设置背景颜色（ARGB格式）
    setTextColor(color: number): void; // 设置文本颜色（ARGB格式）
    setTextSize(size: number): void; // 设置字体大小
    setLineHeight(lineHeight: number): void; // 设置行高
    setButtonColors(closeColor: number, resizeColor: number): void; // 设置按钮颜色（关闭按钮、调整大小按钮）
    setTitleTextColor(color: number): void; // 设置标题栏文字颜色
    setTitleTextSize(size: number): void; // 设置标题栏文字大小
    setTitleText(text: string | null): void; // 设置标题栏文字内容（null或空字符串表示使用应用名称）
    setTitleBarColor(color: number): void; // 设置标题栏背景颜色（-1表示自动计算）
    setAllowMoveToTop(allow: boolean): void; // 设置是否允许移动到顶部
    setAllowMoveToBottom(allow: boolean): void; // 设置是否允许移动到底部
    setClickable(clickable: boolean): void; // 设置是否可点击
    isClickable(): boolean; // 检查是否可点击
    clearLogs(): void; // 清空日志
    setMaxLogLines(maxLines: number): void; // 设置最大行数
    getMaxLogLines(): number; // 获取最大行数
    setAutoScroll(autoScroll: boolean): void; // 设置是否自动滚动
    setWindowStyle(config: { width?: number; height?: number; x?: number; y?: number; backgroundColor?: number; textColor?: number; textSize?: number; lineHeight?: number; closeButtonColor?: number; resizeButtonColor?: number; titleTextColor?: number; titleTextSize?: number; titleText?: string | null; titleBarColor?: number; allowMoveToTop?: boolean; allowMoveToBottom?: boolean; clickable?: boolean; }): void; // 一次性设置多个样式属性
    getWindowStyle(): { width: number; height: number; x: number; y: number; backgroundColor: number; textColor: number; textSize: number; lineHeight: number; closeButtonColor: number; resizeButtonColor: number; titleTextColor: number; titleTextSize: number; titleText: string; titleBarColor: number; allowMoveToTop: boolean; allowMoveToBottom: boolean; clickable: boolean; }; // 获取当前样式配置
  }

  // Http 接口
  var Http: Http;
  interface Http {
    setConnectTimeout(seconds: number): void;
    setReadTimeout(seconds: number): void;
    setWriteTimeout(seconds: number): void;
    setTimeout(connectSeconds: number, readSeconds: number, writeSeconds: number): void;
    setTimeout(seconds: number): void;
    postStream(url: string, json: object, headers: object, onData: (data: string) => void, onError: (error: string) => void): void;
    postStream(url: string, json: object, onData: (data: string) => void, onError: (error: string) => void): void;
    post(url: string, params: object, headers?: object): string;
    get(url: string, headers?: object): string;
    postFile(url: string, files: string[], params: object, httpCallback: {
      success: (response: any) => void,
      fail: (response: any) => void
    }): void;
    download(url: string, destPath: string, headers?: object): string;
  }

  // Storage 接口
  var Storage: Storage;
  interface Storage {
    create(db: string): Storage;
    put(key: string, value: string): boolean;
    putInteger(key: string, value: number): boolean;
    putBoolean(key: string, value: boolean): boolean;
    putDouble(key: string, value: number): boolean;
    putObj(key: string, obj: object): boolean;
    putArray(key: string, arr: any[]): boolean;
    getArray(key: string): any[];
    get(key: string): string;
    getString(key: string): string;
    getBoolean(key: string): boolean;
    getDouble(key: string): number;
    getInteger(key: string): number;
    getObj(key: string): object;
    remove(key: string): any; // 实际返回Single<Preferences>，可以通过blockingSubscribe()获取结果
    clear(): any; // 实际返回Single<Preferences>，可以通过blockingSubscribe()获取结果
    contains(key: string): boolean; // 判断是否包含键为key的数据
  }

  // Files 接口
  var Files: files;
  interface files {
    read(path: string): string | null;
    write(path: string, content: string): boolean;
    append(path: string, content: string): boolean;
    delete(path: string): boolean;
    exists(path: string): boolean;
    mkdirs(path: string): boolean;
    list(path: string): string[];
    listFiles(path: string): string[];
    copy(source: string, destination: string): boolean;
    move(source: string, destination: string): boolean;
    size(path: string): number;
    isDirectory(path: string): boolean;
    isFile(path: string): boolean;
    getName(path: string): string;
    getParent(path: string): string;
    getAbsolutePath(path: string): string;
    rename(oldPath: string, newPath: string): boolean;
    lastModified(path: string): number;
    readUri(uriString: string): string | null;
    readBytesFromUri(uriString: string): number[] | null;
    getPathFromUri(uriString: string): string | null;
    readBytes(path: string): number[] | null;
    writeBytes(path: string, bytes: number[]): boolean;
    copyFromUri(uriString: string, destination: string): boolean;
    getExternalStoragePath(): string;
    getFilesPath(): string;
    getCachePath(): string;
    getExternalFilesPath(type: string | null): string;
    getExternalFilesPath(): string;
    getDownloadPath(): string;
    getPicturesPath(): string;
    getDCIMPath(): string;
    getMoviesPath(): string;
    getMusicPath(): string;
    getDocumentsPath(): string;
    readAsset(fileName: string): string | null;
    isExternalStorageWritable(): boolean;
    isExternalStorageReadable(): boolean;
    getExtension(path: string): string;
    getNameWithoutExtension(path: string): string;
  }

  // Cos 接口（腾讯云COS文件上传）
  var Cos: Cos;
  interface Cos {
    setConfig(secretId: string, secretKey: string, region: string, bucket: string): void;
    upload(localPath: string, cosKey: string): [string | null, string | null];
    upload(localPath: string): [string | null, string | null];
    uploadAsync(localPath: string, cosKey: string, callback: { success: (url: string) => void; fail: (error: string) => void }): void;
    uploadAsync(localPath: string, callback: { success: (url: string) => void; fail: (error: string) => void }): void;
    shutdown(): void;
  }

  // Images 接口
  var Images: Images;
  interface Mat {}
  interface Point {
    x: number;
    y: number;
  }
  interface TextAndRegion {
    text: string;
    rect: Rect;
  }
  interface Images {
    getMat(imageFile: string): Mat;
    findOne(source: Mat, template: Mat, threshold: number): Point;
    find(source: Mat, template: Mat, threshold: number): PointArray;
    capture(): string;
    getColor(imageFile: string, pixelX: number, pixelY: number): string;
    findColor(imageFile: string, color: string): PointArray;
    findColor(imageFile: string, startColor: string, endColor: string): PointArray;
    crop(imageFile: string, left: number, top: number, width: number, height: number): string;
    scale(imageFile: string, multiple: number): string;
    getTextAndRegion(imageFile: string): TextAndRegionArray;
    findTextPosition(imageFile: string, keyword: string): RectArray;
    findTextInRegion(imageFile: string, left: number, top: number, width: number, height: number): StringArray;
  }

  // Device 接口
  var Device: Device;
  interface Device {
    width(): number;
    height(): number;
    pixelDensity(): number; // 获取屏幕像素密度（density，用于dp/px换算）
    sdkInt(): number;
    device(): string;
    androidVersion(): string;
    getUuid(): string; // 获取设备唯一标识符（ANDROID_ID），不恢复出厂就保证唯一
    getToken(): string;
    getAttr(key: string): string;
    brand(): string;
    os(): string;
    model(): string;
    codename(): string;
    getLocation(): { latitude: number; longitude: number; altitude: number; accuracy: number; speed: number; bearing: number; time: number; provider: string; } | null; // 获取设备当前位置信息，需要位置权限
    manufacturer(): string;
    hardware(): string;
    board(): string;
    product(): string;
    bootloader(): string;
    buildId(): string;
    display(): string;
    fingerprint(): string;
    host(): string;
    user(): string;
    getCpuAbi(): string;
    getCpuAbis(): string[];
    getWifiIPAddress(): string;
    getIPAddress(): string;
    getPublicIPAddress(): string;
    getPublicIPAddressV6(): string;
    getPublicIPInfo(): {
      ipv4: string;
      ipv6: string;
    };
    getIpInfo(): {
      ip: string;
      wifiIP: string;
      publicIP: string;
      publicIPV6: string;
      publicIPInfo: {
        ipv4: string;
        ipv6: string;
      };
    };
    getMacAddress(): string;
    getNetworkType(): "WiFi" | "Mobile" | "Ethernet" | "Other" | "None";
    isNetworkConnected(): boolean;
    getNetworkInfo(): {
      type: "WiFi" | "Mobile" | "Ethernet" | "Other" | "None";
      connected: boolean;
      macAddress: string;
      ip: string;
      wifiIP: string;
      publicIP: string;
      publicIPV6: string;
    };
    getStatusBarHeight(): number; // 获取状态栏高度（像素）
    getNavigationBarHeight(): number; // 获取导航栏高度（像素），如果隐藏返回0
    getInstalledPackages(): string[]; // 获取所有已安装应用的包名列表
    getInstalledApplications(): Array<{ packageName: string; appName: string; versionName: string; versionCode: number; }>; // 获取所有已安装应用的详细信息列表
  }

  // DevicePolicy 接口（Device Owner模式）
  var DevicePolicy: DevicePolicy;
  interface DevicePolicy {
    isDeviceOwner(): boolean; // 检查当前应用是否为Device Owner
    lockNow(): boolean; // 立即锁屏/息屏，需要Device Owner权限
    wakeScreen(): boolean; // 亮屏/唤醒屏幕，需要WAKE_LOCK权限
  }

  // DeviceApp 接口（Device Owner模式）
  var DeviceApp: DeviceApp;
  interface DeviceApp {
    PERMISSION_POLICY_PROMPT: number; // 权限策略常量 - 提示用户
    PERMISSION_POLICY_AUTO_GRANT: number; // 权限策略常量 - 自动授予
    PERMISSION_POLICY_AUTO_DENY: number; // 权限策略常量 - 自动拒绝
    PERMISSION_GRANT_STATE_DEFAULT: number; // 权限授予状态常量 - 默认状态
    PERMISSION_GRANT_STATE_DENIED: number; // 权限授予状态常量 - 已拒绝
    PERMISSION_GRANT_STATE_GRANTED: number; // 权限授予状态常量 - 已授予
    installPackage(packageUri: string): boolean; // 静默安装应用，需要Device Owner权限
    uninstallPackage(packageName: string): boolean; // 静默卸载应用，需要Device Owner权限
    setApplicationHidden(packageName: string, hidden: boolean): boolean; // 隐藏/显示应用，需要Device Owner权限
    isApplicationHidden(packageName: string): boolean; // 检查应用是否隐藏，需要Device Owner权限
    setPermissionPolicy(policy: number): boolean; // 设置应用权限策略，需要Device Owner权限
    grantRuntimePermission(packageName: string, permission: string): boolean; // 授予运行时权限，需要Device Owner权限
    isPermissionGranted(packageName: string, permission: string): boolean; // 检查权限是否已授予，需要Device Owner权限
  }

  // DeviceHardware 接口（Device Owner模式）
  var DeviceHardware: DeviceHardware;
  interface DeviceHardware {
    setScreenCaptureDisabled(disabled: boolean): boolean; // 禁用/启用截屏功能，需要Device Owner权限，API 28+
    setKeyguardDisabled(disabled: boolean): boolean; // 禁用/启用锁屏界面，需要Device Owner权限
    setStatusBarDisabled(disabled: boolean): boolean; // 禁用/启用状态栏，需要Device Owner权限，API 26+
  }

  // DeviceKiosk 接口（Device Owner模式）
  var DeviceKiosk: DeviceKiosk;
  interface DeviceKiosk {
    setLockTaskPackages(packages: string[]): boolean; // 设置锁定任务模式的应用包名列表，需要Device Owner权限
    getLockTaskPackages(): string[] | null; // 获取锁定任务模式的应用包名列表，需要Device Owner权限
    isLockTaskModeEnabled(): boolean; // 检查锁定任务模式是否启用
  }

  // SocketIOClient 接口
  var SocketIoClient: socketIoClient;
  interface socketIoClient {
    getInstance(serverUrl: string, reconnect?: boolean, timeout?: number): socketIOClient;
    connect(): void;
    disconnect(): void;
    isConnected(): boolean;
    emit(eventName: string, data: string): void;
    emit(eventName: string, data: string, callback: (response: any) => void): void;
    on(eventName: string, callback: (data: string) => void): void;
    off(eventName: string, callback: (data: string) => void): void;
    off(eventName: string): void;
    off(): void;
    setReconnect(bool: boolean): void;
  }

  // Encrypt 接口
  var Encrypt: Encrypt;
  interface Encrypt {
    md5(input: string): string;
    sha1(input: string): string;
    sha256(input: string): string;
    base64Encode(input: string | number[]): string;
    base64Decode(input: string): string;
    generateIv(): string;
    hmac_sha256(key: string, data: string): string;
    aesCbcEncode(key: string, iv: string, input: string): string;
    aesCbcDecode(key: string, iv: string, input: string): string;
  }

  // Gesture 接口
  var Gesture: Gesture;
  interface Gesture {
    click(x: number, y: number): boolean;
    longClick(x: number, y: number): boolean;
    press(x: number, y: number, duration: number): boolean;
    swipe(x1: number, y1: number, x2: number, y2: number, duration: number): boolean;
    back(): boolean;
    home(): boolean;
    recents(): boolean;
  }

  // System 接口
  var System: System;
  interface System {
    sleep(milliSecond: number): void;
    preciseSleep(milliSecond: number): void; // 精确休眠，使用WakeLock保持CPU唤醒状态，确保休眠时间准确性
    gc(): void;
    time(): string;
    currentActivity(): string;
    currentPackage(): string;
    setClip(text: string): void;
    getClip(): string;
    toast(text: string): void;
    toastLong(text: string): void;
    waitForActivity(activity: string, period: number, timeout: number): boolean;
    waitForPackage(packageName: string, period: number, timeout: number): boolean;
    exit(): void;
    cleanUp(): void;
    AiSpeechToken(key: string, secret: string): string;
    generateWindowElements(): void;
    getDataFrom(key: string, dataForm: string, content: string): string | null;
    setTimeWindowShow(show: boolean): void;
    setAccessibilityMode(mode: string): void;
    setKeepScreenOn(keepOn: boolean): void;
    getLocaleInfo(): { language: string; country: string; tag: string; }; // 系统语言/区域（language、country、BCP47 tag）
  }

  // Threads 接口
  var Threads: Threads;
  interface Threads {
    create(runnable: (() => void) | { run: () => void }): ThreadWrapper; // 创建一个新线程并执行指定的任务
    sleep(millis: number): void; // 休眠当前线程指定的毫秒数
    yield(): void; // 让出当前线程的CPU时间片，允许其他线程执行
    currentThread(): ThreadWrapper; // 获取当前线程的ThreadWrapper对象
  }

  // ThreadWrapper 接口
  interface ThreadWrapper {
    start(): void; // 启动线程
    join(): void; // 等待线程任务完成
    join(millis: number): void; // 等待线程任务完成，最多等待指定的毫秒数
    interrupt(): void; // 中断线程
    isAlive(): boolean; // 检查线程是否存活
    isInterrupted(): boolean; // 检查线程是否被中断
    setName(name: string): void; // 设置线程名称
    getName(): string; // 获取线程名称
    setPriority(priority: number): void; // 设置线程优先级（1-10），数字越大优先级越高
    getPriority(): number; // 获取线程优先级（1-10）
    getThread(): any; // 获取底层的Java Thread对象（通常不需要使用）
  }

  // Java 接口
  var java: any;
  var Packages: any;
  function JavaImporter(...packages: any[]): any;

  // Intent 接口
  var Intent: Intent;
  interface Intent {
    open(): void;
  }

  // Access 接口
  var Access: access;
  interface access {
    isAccessibilityServiceEnabled(): boolean;
    isFloatWindowsEnabled(): boolean;
    isBackgroundAlertEnabled(): boolean;
    isMediaProjectionEnable(): boolean;
    openAccessibilityServiceSetting(): void;
    openFloatWindowsSetting(): void;
    openBackgroundAlertSetting(): void;
    openMediaProjectionSetting(): void;
    requestNotificationAccess(): void;
    hasNotificationAccess(): boolean;
    hasMediaReadPermission(): boolean;
    requestMediaPermissions(): void;
    openPermissionSettings(): void;
    isMediaPermissionPermanentlyDenied(): boolean;
    hasStoragePermission(): boolean;
    requestStoragePermission(): void;
    isStoragePermissionPermanentlyDenied(): boolean;
    hasLocationPermission(): boolean; // 检查是否有位置权限
    requestLocationPermissions(): void; // 申请位置权限
    isLocationPermissionPermanentlyDenied(): boolean; // 检查位置权限是否被永久拒绝
    hasBluetoothConnectionPermission(): boolean; // 检查是否有蓝牙连接权限
    requestBluetoothConnectionPermission(): void; // 申请蓝牙连接权限
    isBluetoothPermissionPermanentlyDenied(): boolean; // 检查蓝牙权限是否被永久拒绝
    openBluetoothPermissionSettings(): void; // 打开蓝牙权限设置页面
  }

  // MediaStore 接口
  var MediaStore: MediaStore;
  interface MediaStore {
    // 图片操作
    getImages(): any[];
    getImagesByPath(path: string): any[];
    saveImage(sourcePath: string, displayName?: string, relativePath?: string): string | null;
    saveImage(sourcePath: string): string | null;
    deleteImage(uriString: string): boolean;
    // 视频操作
    getVideos(): any[];
    saveVideo(sourcePath: string, displayName?: string, relativePath?: string): string | null;
    saveVideo(sourcePath: string): string | null;
    deleteVideo(uriString: string): boolean;
    // 音频操作
    getAudios(): any[];
    saveAudio(sourcePath: string, displayName?: string): string | null;
    // 下载文件操作
    saveToDownloads(sourcePath: string, displayName?: string): string | null;
    getDownloads(): any[];
    // 文档操作
    saveToDocuments(sourcePath: string, displayName?: string): string | null;
    saveToDocuments(sourcePath: string): string | null;
    getDocuments(): any[];
    // 通用操作
    readFromUri(uriString: string): number[] | null;
    queryMediaInfo(uriString: string): any;
  }

  // App 接口
  var App: App;
  interface App {
    currentPackageName(): string;
    currentVersionCode(): number;
    currentVersionName(): string;
    packageInfo(packageName: string): any;
    gotoIntent(uri: string): void;
    startActivity(intent: Intent): void;
    backApp(): void;
    launch(packageName: string): void;
    notifySuccess(title: string, content: string): void;
    isAppInstalled(packageName: string): boolean;
    getAppVersionName(packageName: string): string;
    getAppVersionCode(packageName: string): number;
    openAppSetting(packageName: string): void;
    openUrl(url: string, packageName?: string): void; // 打开URL地址。如果提供了packageName，则优先使用指定应用打开，如果应用未安装则使用浏览器打开；如果未提供packageName，则直接使用浏览器打开
  }

  // Dialogs 接口
  var Dialogs: Dialogs;
  interface Dialogs {
    show(title: string, content: string): void;
    show(title: string): void;
    confirm(title: string, content: string, callback: (result: boolean) => void): void;
    input(title: string): string;
    input(title: string, value: object): string;
  }

  // Engines 接口
  var Engines: Engines;
  interface Engines {
    executeScript(file: string): void;
    executeScriptStr(name: string, content: string): void;
    closeAll(): void;
    closeOther(): void;
    closeHook(): void;
    childScriptCount(): number;
  }

  // FloatDialogs 接口
  var FloatDialogs: FloatDialogs;
  interface FloatDialogs {
    show(title: string, content: string): void;
    show(content: string): void;
    closeAll(): void;
    setFloatWindowClickable(clickable: boolean): void;
    setFloatWindowVisible(visible: boolean): void;
    toast(content: string): void;
    toastLong(content: string): void;
    /**
     * 显示确认对话框，支持动态修改内容和回调函数
     * 此方法会阻塞当前线程，直到用户点击按钮或回调函数返回true
     * 注意：此方法需要在初始化FloatDialogs时传入scope参数才能使用
     * @param title 弹窗标题
     * @param content 弹窗内容
     * @param confirmText 确定按钮文字
     * @param cancelText 取消按钮文字
     * @param callback 回调函数，接收一个dialog对象作为参数，可以通过dialog.setContent()动态修改弹窗内容。如果回调函数返回true，则自动关闭对话框；返回false或不返回值，则继续等待用户点击按钮
     * @returns 如果用户点击了确定按钮返回true，点击了取消按钮返回false
     */
    confirm(title: string, content: string, confirmText: string, cancelText: string, callback: (dialog: FloatDialog) => boolean | void): boolean;
  }

  // FloatDialog 接口
  interface FloatDialog {
    /**
     * 设置对话框内容
     * @param content 对话框内容
     */
    setContent(content: string): void;
  }

  // Hid 接口
  var Hid: hid;
  interface hid {
    swipe(x1: number, y1: number, x2: number, y2: number, step?: number, downTimeout?: number, upTimeout?: number, timeout?: number, upDownTimes?: number): boolean;
    swipex(x1: number, y1: number, x2: number, y2: number, radian?: number, step?: number, downTimeout?: number, upTimeout?: number, timeout?: number, upDownTimes?: number): boolean;
    getHidZcm(): string;
    ver(): number;
    home(): boolean;
    recents(): boolean;
    back(): boolean;
    back1(): boolean;
    touchDown(x: number, y: number): boolean;
    touchMove(x: number, y: number): boolean;
    touchUp(x?: number, y?: number): boolean;
    touchUp2(): boolean;
    tap(x: number, y: number): boolean;
    initBluetooth(ctx: any): boolean;
    getName(): string;
    keyDown(code: number): boolean;
    keyUp(code: number): boolean;
    keyPress(code: number): boolean;
    keyPress_code(code: number): boolean;
    keyDown_code(code: number): boolean;
    keyUp_code(code: number): boolean;
    keyUpAll(): boolean;
    key_select(): boolean;
    key_paste(): boolean;
    key_copy(): boolean;
    key_cat(): boolean;
    key_del(): boolean;
    key_delete(): boolean;
    key_enter(): boolean;
    key_num(n: number): boolean;
    key_abc(n: string): boolean;
    volUp(): boolean;
    volDown(): boolean;
    power(time?: number): boolean;
    reboot(): boolean;
    setXY(x: number, y: number): boolean;
    reg(key: string): boolean;
    setRnd(x: number, y: number): boolean;
    setBattery(lv: number): boolean;
    connect(autoconnect: boolean, index: number): boolean;
    getConnectedDevices(): any;
    getConnectState(): boolean;
    sendData(str: string): boolean;
    sendDataAwait(str: string, time: number): boolean;
    getData(time?: number): string;
    waitFor(time?: number, sleep?: number): string;
    disconnect(): boolean;
  }

  // KeyBoards 接口
  var KeyBoards: KeyBoards;
  interface KeyBoards {
    isEnabled(): boolean;
    canInput(): boolean;
    input(str: string): boolean;
    delete(): boolean;
    hide(): boolean;
    pressKey(key: string | number): boolean;
    pressEnter(): boolean;
    pressTab(): boolean;
    pressSpace(): boolean;
    /**
     * 智能方法：根据当前状态自动跳转到合适的页面
     * - 如果已经是默认输入法，返回 true
     * - 如果未启用，跳转到启用页面（用户需要先启用）
     * - 如果已启用但未设为默认，弹出输入法选择界面（用户可以选择为默认）
     * @returns 返回当前输入法是否已设为默认（true表示已是默认，false表示需要用户操作）
     */
    showInputMethodPicker(): boolean;
  }

  // Log 接口
  var Log: log;
  interface log {
    setFile(filename: string): boolean;
    log(...obj: object): void;
  }

  // WebSocket 接口
  var WebSocket: {
    new (url: string): webSocket;
    closeAll(): void;
  };
  interface webSocket {
    onOpen(): void;
    onMessage(data: string): void;
    onClose(code: number, reason: string): void;
    onError(errorMsg: string): void;
    send(data: string): void;
    close(): void;
  }

  // Audio 接口
  var Audio: Audio;
  interface Audio {
    load(source: string): boolean; // 载入音频资源（不会自动播放），支持 http(s)、file://、content://、绝对路径、project:// 前缀
    play(source: string): boolean; // 加载并播放音频
    play(): boolean; // 播放当前已加载的音频
    pause(): boolean; // 暂停播放
    stop(): boolean; // 停止播放（播放位置重置到开头）
    release(): void; // 释放播放器资源
    seekTo(msec: number): boolean; // 跳转到指定位置（毫秒）
    setLooping(looping: boolean): boolean; // 设置是否循环播放
    setVolume(leftVolume: number, rightVolume: number): boolean; // 设置左右声道音量 0.0~1.0
    isPlaying(): boolean; // 是否正在播放
    isLoaded(): boolean; // 是否已加载音频
    getDuration(): number; // 获取音频总时长（毫秒），未加载返回 -1
    getCurrentPosition(): number; // 获取当前播放位置（毫秒），未加载返回 -1
    getCurrentSource(): string; // 获取当前加载的音频源路径
    canPlayInBackground(): boolean; // 是否具备后台播放能力
    hasForegroundServicePermission(): boolean; // 是否已声明前台服务权限
  }

  // DeekeScriptJson 接口
  var DeekeScriptJson: DeekeScriptJson;
  interface DeekeScriptJson {
    setDeekeScriptJsonGroup(str: string): void;
    setSettingLists(str: string): void;
    toJson(): object;
  }

  // ForegroundServiceBridge 接口
  var ForegroundServiceBridge: foregroundServiceBridge;
  interface foregroundServiceBridge {
    startService(): void;
    register(func: Function): void;
    setContent(title: string, content: string): void;
    stopService(): void;
  }

  // NotificationBridge 接口
  var NotificationBridge: notificationBridge;
  interface notificationBridge {
    startService(): void;
    startListening(
      onNotification: (packageName: string, title: string, text: string) => void,
      onNotificationRemoved: (packageName: string, title: string, text: string) => void
    ): void;
    stopService(): void;
  }

  // Global 类型别名
  type Storage = Storage;
  type WebSocket = WebSocket;

  // DeekeScript 接口
  var DeekeScript: DeekeScript;
  interface DeekeScript {
    version(): number;
    readFile(path: string): string | null; // 读取 JS 项目目录下的文件内容
    getProjectRoot(): string; // 获取当前 JS 项目的根目录绝对路径
    getNodeFields(): string[]; // 获取可设置的节点字段名列表
    getAllAccessibilityNodeInfo(bool: boolean, fields: string[]): { nodes: DeekeNodeInfo[] } | null; // 一次性获取当前界面所有控件的节点信息
  }

  // DeekeBounds 接口
  interface DeekeBounds {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  // DeekeNodeInfo 接口
  interface DeekeNodeInfo {
    key?: string;
    viewIdResourceName?: string;
    text?: string;
    contentDescription?: string;
    className?: string;
    childCount?: number;
    packageName?: string;
    hintText?: string;
    inputType?: number;
    drawingOrder?: number;
    depth?: number;
    maxTextLength?: number;
    isPassword?: boolean;
    boundsInScreen?: DeekeBounds;
    boundsInParent?: DeekeBounds;
    isClickable?: boolean;
    isCheckable?: boolean;
    isChecked?: boolean;
    isEditable?: boolean;
    isEnabled?: boolean;
    isScrollable?: boolean;
    isSelected?: boolean;
    isVisibleToUser?: boolean;
    isFocusable?: boolean;
    isFocused?: boolean;
    isLongClickable?: boolean;
    isDismissable?: boolean;
    children?: DeekeNodeInfo[];
  }
}

export {};
`;
  };


  // 设置DeekeScript API - 添加类型定义
  const setupDeekeScriptAPI = async (monaco: typeof import('monaco-editor')) => {
    try {
      // 注册DeekeScript语言
      monaco.languages.register({ id: 'deekescript' });

      // 添加DeekeScript类型定义到JavaScript语言服务
      const deekeScriptTypes = getDeekeScriptTypes();

      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        deekeScriptTypes,
        'deekescript.d.ts'
      );

      console.log('DeekeScript API 类型定义已添加');
    } catch (error) {
      console.error('设置DeekeScript API时出错:', error);
    }
  };

  // 处理编辑器值变化
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      props.onChange(value);
    }
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
      <Editor
      height={props.height || 400}
      language="javascript"
      theme={props.theme || 'eye-care-green'}
      value={props.value}
      onChange={handleEditorChange}
      beforeMount={registerThemes}
      onMount={handleEditorDidMount}
      options={{
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
        mouseWheelZoom: true,
        wordWrap: 'on' as const,
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 16,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        suggest: {
          showKeywords: true, // 重新启用关键词提示，支持全局变量
          showSnippets: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true, // 重新启用变量提示，支持全局变量
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true, // 重新启用模块提示
          showProperties: true,
          showEvents: true,
          showOperators: false, // 禁用操作符提示
          showUnits: false, // 禁用单位提示
          showValues: false, // 禁用值提示
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showColors: false, // 禁用颜色提示
          showFiles: false, // 禁用文件提示
          showReferences: false, // 禁用引用提示
          showFolders: false, // 禁用文件夹提示
          showTypeParameters: true,
          showIssues: false, // 禁用问题提示
          showUsers: false, // 禁用用户提示
          showWords: false, // 禁用单词提示
        },
        parameterHints: {
          enabled: true,
        },
        hover: {
          enabled: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        wordBasedSuggestions: false,
      }}
    />
    </div>
  );
};

export default MonacoEditor;
