"use strict";(self.webpackChunkant_design_pro=self.webpackChunkant_design_pro||[]).push([[903],{37903:function(O,p,r){var A=r(97983),c=r.n(A),v=r(40794),C=r.n(v),F=r(67294),d=r(63764),b=r(85893);d._m.config({paths:{vs:"/monaco-editor/vs"},"vs/nls":{availableLanguages:{"*":"zh-cn"}}});var h=function(o){var f=(0,F.useRef)(null),y=(0,F.useRef)(null),k=function(e){e.editor.defineTheme("eye-care-green",{base:"vs",inherit:!0,rules:[{token:"comment",foreground:"6A9955",fontStyle:"italic"},{token:"keyword",foreground:"0000FF",fontStyle:"bold"},{token:"string",foreground:"A31515"},{token:"number",foreground:"098658"},{token:"type",foreground:"267F99",fontStyle:"bold"},{token:"function",foreground:"795E26"},{token:"variable",foreground:"001080"}],colors:{"editor.background":"#FFFDF0","editorGutter.background":"#E8E8E8","editorLineNumber.foreground":"#999","editorLineNumber.activeForeground":"#555","editor.selectionBackground":"#D4E6B8","editorCursor.foreground":"#2D3748","editorIndentGuide.background":"#E8E8E8"}}),e.editor.defineTheme("eye-care-blue",{base:"vs",inherit:!0,rules:[{token:"comment",foreground:"6A9955",fontStyle:"italic"},{token:"keyword",foreground:"0000FF",fontStyle:"bold"},{token:"string",foreground:"A31515"},{token:"number",foreground:"098658"},{token:"type",foreground:"267F99",fontStyle:"bold"},{token:"function",foreground:"795E26"}],colors:{"editor.background":"#F0F8FF","editorLineNumber.foreground":"#718096","editor.selectionBackground":"#BEE3F8"}})},S=function(e,n){f.current=e,y.current=n;try{w(n)}catch(u){console.warn("\u8BBE\u7F6E Rhino 1.8 JS \u9009\u9879\u5931\u8D25: ",u)}_(n).catch(function(u){console.error("\u8BBE\u7F6EDeekeScript API\u5931\u8D25:",u)});var t=e.getModel();t&&console.log("\u7F16\u8F91\u5668\u6A21\u578B\u5DF2\u521B\u5EFA:",t.uri.toString()),e.updateOptions({fontSize:16,tabSize:2,wordWrap:"on",lineNumbers:"on",minimap:{enabled:!1},scrollBeyondLastLine:!1,automaticLayout:!0,suggest:{showKeywords:!0,showSnippets:!0,showFunctions:!0,showConstructors:!0,showFields:!0,showVariables:!0,showClasses:!0,showStructs:!0,showInterfaces:!0,showModules:!0,showProperties:!0,showEvents:!0,showOperators:!1,showUnits:!1,showValues:!1,showConstants:!0,showEnums:!0,showEnumMembers:!0,showColors:!1,showFiles:!1,showReferences:!1,showFolders:!1,showTypeParameters:!0,showIssues:!1,showUsers:!1,showWords:!1}}),e.onDidChangeModelContent(function(){var u=e.getValue();o.onChange(u),m(e,n)}),e.onDidBlurEditorText(function(){o.onBlur&&o.onBlur(e.getValue())}),e.onKeyDown(function(u){u.shiftKey&&u.keyCode===n.KeyCode.Enter&&(o.onShiftEnter&&o.onShiftEnter(),u.preventDefault())}),m(e,n),console.log("Monaco Editor \u5DF2\u521D\u59CB\u5316\u5B8C\u6210")},w=function(e){e.languages.typescript.javascriptDefaults.setCompilerOptions({allowJs:!0,target:e.languages.typescript.ScriptTarget.ES2015,lib:["es5"],noLib:!1,allowNonTsExtensions:!0,module:e.languages.typescript.ModuleKind.None,downlevelIteration:!1,noEmit:!0,skipLibCheck:!0,checkJs:!1}),e.languages.typescript.javascriptDefaults.setDiagnosticsOptions({noSemanticValidation:!1,noSyntaxValidation:!1}),e.languages.typescript.javascriptDefaults.setEagerModelSync(!0)},m=function(e,n){var t=e.getModel();if(t){var u=t.getValue(),s=[{name:"import",regex:/(^|\n)\s*import\s+[^;]+;/,message:"Rhino 1.8 \u9ED8\u8BA4\u4E0D\u652F\u6301 ES Modules\uFF08import\uFF09\u3002"},{name:"export",regex:/(^|\n)\s*export\s+[^;]+;/,message:"Rhino 1.8 \u9ED8\u8BA4\u4E0D\u652F\u6301 ES Modules\uFF08export\uFF09\u3002"},{name:"async",regex:/(^|\n)\s*async\s+function\b|\basync\s*\(/,message:"Rhino 1.8 \u4E0D\u652F\u6301 async/await\u3002"}],l=[];s.forEach(function(a){for(var g,T=new RegExp(a.regex.source,a.regex.flags.includes("g")?a.regex.flags:a.regex.flags+"g");(g=T.exec(u))!=null;){var E=g.index,I=E+(g[0]?g[0].length:1),D=t.getPositionAt(E),B=t.getPositionAt(I);l.push({severity:n.MarkerSeverity.Error,message:a.message+" \u53C2\u8003 Rhino ES2015 \u652F\u6301\u8868\uFF1Ahttps://mozilla.github.io/rhino/compat/engines.html",startLineNumber:D.lineNumber,startColumn:D.column,endLineNumber:B.lineNumber,endColumn:B.column,source:"rhino-1.8"})}}),n.editor.setModelMarkers(t,"rhino-1.8",l)}},P=function(){return`
declare global {
  // \u5168\u5C40\u51FD\u6570\u7C7B\u578B\u5B9A\u4E49
  function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;
  function clearTimeout(id: number): void;
  function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;
  function clearInterval(id: number): void;

  // UiSelector \u7C7B
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

  // \u4E3A\u6570\u7EC4\u8BBF\u95EE\u63D0\u4F9B\u66F4\u597D\u7684\u7C7B\u578B\u63A8\u65AD
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

  // UiObject \u63A5\u53E3
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

  // Rect \u7C7B
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

  // Console \u63A5\u53E3
  var console: Console;
  interface Console {
    log(...message: any[]): void;
    warn(...message: any[]): void;
    error(...message: any[]): void;
    info(...message: any[]): void;
    debug(...message: any[]): void;
    trace(...message: any[]): void;
    show(): void; // \u663E\u793A\u65E5\u5FD7\u7A97\u53E3
    hide(): void; // \u9690\u85CF\u65E5\u5FD7\u7A97\u53E3
    setWindowSize(width: number, height: number): void; // \u8BBE\u7F6E\u65E5\u5FD7\u7A97\u53E3\u5927\u5C0F
    setWindowPosition(x: number, y: number): void; // \u8BBE\u7F6E\u65E5\u5FD7\u7A97\u53E3\u4F4D\u7F6E
    setBackgroundColor(color: number): void; // \u8BBE\u7F6E\u80CC\u666F\u989C\u8272\uFF08ARGB\u683C\u5F0F\uFF09
    setTextColor(color: number): void; // \u8BBE\u7F6E\u6587\u672C\u989C\u8272\uFF08ARGB\u683C\u5F0F\uFF09
    setTextSize(size: number): void; // \u8BBE\u7F6E\u5B57\u4F53\u5927\u5C0F
    setLineHeight(lineHeight: number): void; // \u8BBE\u7F6E\u884C\u9AD8
    setButtonColors(closeColor: number, resizeColor: number): void; // \u8BBE\u7F6E\u6309\u94AE\u989C\u8272\uFF08\u5173\u95ED\u6309\u94AE\u3001\u8C03\u6574\u5927\u5C0F\u6309\u94AE\uFF09
    setTitleTextColor(color: number): void; // \u8BBE\u7F6E\u6807\u9898\u680F\u6587\u5B57\u989C\u8272
    setTitleTextSize(size: number): void; // \u8BBE\u7F6E\u6807\u9898\u680F\u6587\u5B57\u5927\u5C0F
    setTitleText(text: string | null): void; // \u8BBE\u7F6E\u6807\u9898\u680F\u6587\u5B57\u5185\u5BB9\uFF08null\u6216\u7A7A\u5B57\u7B26\u4E32\u8868\u793A\u4F7F\u7528\u5E94\u7528\u540D\u79F0\uFF09
    setTitleBarColor(color: number): void; // \u8BBE\u7F6E\u6807\u9898\u680F\u80CC\u666F\u989C\u8272\uFF08-1\u8868\u793A\u81EA\u52A8\u8BA1\u7B97\uFF09
    setAllowMoveToTop(allow: boolean): void; // \u8BBE\u7F6E\u662F\u5426\u5141\u8BB8\u79FB\u52A8\u5230\u9876\u90E8
    setAllowMoveToBottom(allow: boolean): void; // \u8BBE\u7F6E\u662F\u5426\u5141\u8BB8\u79FB\u52A8\u5230\u5E95\u90E8
    setClickable(clickable: boolean): void; // \u8BBE\u7F6E\u662F\u5426\u53EF\u70B9\u51FB
    isClickable(): boolean; // \u68C0\u67E5\u662F\u5426\u53EF\u70B9\u51FB
    clearLogs(): void; // \u6E05\u7A7A\u65E5\u5FD7
    setMaxLogLines(maxLines: number): void; // \u8BBE\u7F6E\u6700\u5927\u884C\u6570
    getMaxLogLines(): number; // \u83B7\u53D6\u6700\u5927\u884C\u6570
    setAutoScroll(autoScroll: boolean): void; // \u8BBE\u7F6E\u662F\u5426\u81EA\u52A8\u6EDA\u52A8
    setWindowStyle(config: { width?: number; height?: number; x?: number; y?: number; backgroundColor?: number; textColor?: number; textSize?: number; lineHeight?: number; closeButtonColor?: number; resizeButtonColor?: number; titleTextColor?: number; titleTextSize?: number; titleText?: string | null; titleBarColor?: number; allowMoveToTop?: boolean; allowMoveToBottom?: boolean; clickable?: boolean; }): void; // \u4E00\u6B21\u6027\u8BBE\u7F6E\u591A\u4E2A\u6837\u5F0F\u5C5E\u6027
    getWindowStyle(): { width: number; height: number; x: number; y: number; backgroundColor: number; textColor: number; textSize: number; lineHeight: number; closeButtonColor: number; resizeButtonColor: number; titleTextColor: number; titleTextSize: number; titleText: string; titleBarColor: number; allowMoveToTop: boolean; allowMoveToBottom: boolean; clickable: boolean; }; // \u83B7\u53D6\u5F53\u524D\u6837\u5F0F\u914D\u7F6E
  }

  // Http \u63A5\u53E3
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

  // Storage \u63A5\u53E3
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
    remove(key: string): any; // \u5B9E\u9645\u8FD4\u56DESingle<Preferences>\uFF0C\u53EF\u4EE5\u901A\u8FC7blockingSubscribe()\u83B7\u53D6\u7ED3\u679C
    clear(): any; // \u5B9E\u9645\u8FD4\u56DESingle<Preferences>\uFF0C\u53EF\u4EE5\u901A\u8FC7blockingSubscribe()\u83B7\u53D6\u7ED3\u679C
    contains(key: string): boolean; // \u5224\u65AD\u662F\u5426\u5305\u542B\u952E\u4E3Akey\u7684\u6570\u636E
  }

  // Files \u63A5\u53E3
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

  // Cos \u63A5\u53E3\uFF08\u817E\u8BAF\u4E91COS\u6587\u4EF6\u4E0A\u4F20\uFF09
  var Cos: Cos;
  interface Cos {
    setConfig(secretId: string, secretKey: string, region: string, bucket: string): void;
    upload(localPath: string, cosKey: string): [string | null, string | null];
    upload(localPath: string): [string | null, string | null];
    uploadAsync(localPath: string, cosKey: string, callback: { success: (url: string) => void; fail: (error: string) => void }): void;
    uploadAsync(localPath: string, callback: { success: (url: string) => void; fail: (error: string) => void }): void;
    shutdown(): void;
  }

  // Images \u63A5\u53E3
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

  // Device \u63A5\u53E3
  var Device: Device;
  interface Device {
    width(): number;
    height(): number;
    pixelDensity(): number; // \u83B7\u53D6\u5C4F\u5E55\u50CF\u7D20\u5BC6\u5EA6\uFF08density\uFF0C\u7528\u4E8Edp/px\u6362\u7B97\uFF09
    sdkInt(): number;
    device(): string;
    androidVersion(): string;
    getUuid(): string; // \u83B7\u53D6\u8BBE\u5907\u552F\u4E00\u6807\u8BC6\u7B26\uFF08ANDROID_ID\uFF09\uFF0C\u4E0D\u6062\u590D\u51FA\u5382\u5C31\u4FDD\u8BC1\u552F\u4E00
    getToken(): string;
    getAttr(key: string): string;
    brand(): string;
    os(): string;
    model(): string;
    codename(): string;
    getLocation(): { latitude: number; longitude: number; altitude: number; accuracy: number; speed: number; bearing: number; time: number; provider: string; } | null; // \u83B7\u53D6\u8BBE\u5907\u5F53\u524D\u4F4D\u7F6E\u4FE1\u606F\uFF0C\u9700\u8981\u4F4D\u7F6E\u6743\u9650
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
    getStatusBarHeight(): number; // \u83B7\u53D6\u72B6\u6001\u680F\u9AD8\u5EA6\uFF08\u50CF\u7D20\uFF09
    getNavigationBarHeight(): number; // \u83B7\u53D6\u5BFC\u822A\u680F\u9AD8\u5EA6\uFF08\u50CF\u7D20\uFF09\uFF0C\u5982\u679C\u9690\u85CF\u8FD4\u56DE0
    getInstalledPackages(): string[]; // \u83B7\u53D6\u6240\u6709\u5DF2\u5B89\u88C5\u5E94\u7528\u7684\u5305\u540D\u5217\u8868
    getInstalledApplications(): Array<{ packageName: string; appName: string; versionName: string; versionCode: number; }>; // \u83B7\u53D6\u6240\u6709\u5DF2\u5B89\u88C5\u5E94\u7528\u7684\u8BE6\u7EC6\u4FE1\u606F\u5217\u8868
  }

  // DevicePolicy \u63A5\u53E3\uFF08Device Owner\u6A21\u5F0F\uFF09
  var DevicePolicy: DevicePolicy;
  interface DevicePolicy {
    isDeviceOwner(): boolean; // \u68C0\u67E5\u5F53\u524D\u5E94\u7528\u662F\u5426\u4E3ADevice Owner
    lockNow(): boolean; // \u7ACB\u5373\u9501\u5C4F/\u606F\u5C4F\uFF0C\u9700\u8981Device Owner\u6743\u9650
    wakeScreen(): boolean; // \u4EAE\u5C4F/\u5524\u9192\u5C4F\u5E55\uFF0C\u9700\u8981WAKE_LOCK\u6743\u9650
  }

  // DeviceApp \u63A5\u53E3\uFF08Device Owner\u6A21\u5F0F\uFF09
  var DeviceApp: DeviceApp;
  interface DeviceApp {
    PERMISSION_POLICY_PROMPT: number; // \u6743\u9650\u7B56\u7565\u5E38\u91CF - \u63D0\u793A\u7528\u6237
    PERMISSION_POLICY_AUTO_GRANT: number; // \u6743\u9650\u7B56\u7565\u5E38\u91CF - \u81EA\u52A8\u6388\u4E88
    PERMISSION_POLICY_AUTO_DENY: number; // \u6743\u9650\u7B56\u7565\u5E38\u91CF - \u81EA\u52A8\u62D2\u7EDD
    PERMISSION_GRANT_STATE_DEFAULT: number; // \u6743\u9650\u6388\u4E88\u72B6\u6001\u5E38\u91CF - \u9ED8\u8BA4\u72B6\u6001
    PERMISSION_GRANT_STATE_DENIED: number; // \u6743\u9650\u6388\u4E88\u72B6\u6001\u5E38\u91CF - \u5DF2\u62D2\u7EDD
    PERMISSION_GRANT_STATE_GRANTED: number; // \u6743\u9650\u6388\u4E88\u72B6\u6001\u5E38\u91CF - \u5DF2\u6388\u4E88
    installPackage(packageUri: string): boolean; // \u9759\u9ED8\u5B89\u88C5\u5E94\u7528\uFF0C\u9700\u8981Device Owner\u6743\u9650
    uninstallPackage(packageName: string): boolean; // \u9759\u9ED8\u5378\u8F7D\u5E94\u7528\uFF0C\u9700\u8981Device Owner\u6743\u9650
    setApplicationHidden(packageName: string, hidden: boolean): boolean; // \u9690\u85CF/\u663E\u793A\u5E94\u7528\uFF0C\u9700\u8981Device Owner\u6743\u9650
    isApplicationHidden(packageName: string): boolean; // \u68C0\u67E5\u5E94\u7528\u662F\u5426\u9690\u85CF\uFF0C\u9700\u8981Device Owner\u6743\u9650
    setPermissionPolicy(policy: number): boolean; // \u8BBE\u7F6E\u5E94\u7528\u6743\u9650\u7B56\u7565\uFF0C\u9700\u8981Device Owner\u6743\u9650
    grantRuntimePermission(packageName: string, permission: string): boolean; // \u6388\u4E88\u8FD0\u884C\u65F6\u6743\u9650\uFF0C\u9700\u8981Device Owner\u6743\u9650
    isPermissionGranted(packageName: string, permission: string): boolean; // \u68C0\u67E5\u6743\u9650\u662F\u5426\u5DF2\u6388\u4E88\uFF0C\u9700\u8981Device Owner\u6743\u9650
  }

  // DeviceHardware \u63A5\u53E3\uFF08Device Owner\u6A21\u5F0F\uFF09
  var DeviceHardware: DeviceHardware;
  interface DeviceHardware {
    setScreenCaptureDisabled(disabled: boolean): boolean; // \u7981\u7528/\u542F\u7528\u622A\u5C4F\u529F\u80FD\uFF0C\u9700\u8981Device Owner\u6743\u9650\uFF0CAPI 28+
    setKeyguardDisabled(disabled: boolean): boolean; // \u7981\u7528/\u542F\u7528\u9501\u5C4F\u754C\u9762\uFF0C\u9700\u8981Device Owner\u6743\u9650
    setStatusBarDisabled(disabled: boolean): boolean; // \u7981\u7528/\u542F\u7528\u72B6\u6001\u680F\uFF0C\u9700\u8981Device Owner\u6743\u9650\uFF0CAPI 26+
  }

  // DeviceKiosk \u63A5\u53E3\uFF08Device Owner\u6A21\u5F0F\uFF09
  var DeviceKiosk: DeviceKiosk;
  interface DeviceKiosk {
    setLockTaskPackages(packages: string[]): boolean; // \u8BBE\u7F6E\u9501\u5B9A\u4EFB\u52A1\u6A21\u5F0F\u7684\u5E94\u7528\u5305\u540D\u5217\u8868\uFF0C\u9700\u8981Device Owner\u6743\u9650
    getLockTaskPackages(): string[] | null; // \u83B7\u53D6\u9501\u5B9A\u4EFB\u52A1\u6A21\u5F0F\u7684\u5E94\u7528\u5305\u540D\u5217\u8868\uFF0C\u9700\u8981Device Owner\u6743\u9650
    isLockTaskModeEnabled(): boolean; // \u68C0\u67E5\u9501\u5B9A\u4EFB\u52A1\u6A21\u5F0F\u662F\u5426\u542F\u7528
  }

  // SocketIOClient \u63A5\u53E3
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

  // Encrypt \u63A5\u53E3
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

  // Gesture \u63A5\u53E3
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

  // System \u63A5\u53E3
  var System: System;
  interface System {
    sleep(milliSecond: number): void;
    preciseSleep(milliSecond: number): void; // \u7CBE\u786E\u4F11\u7720\uFF0C\u4F7F\u7528WakeLock\u4FDD\u6301CPU\u5524\u9192\u72B6\u6001\uFF0C\u786E\u4FDD\u4F11\u7720\u65F6\u95F4\u51C6\u786E\u6027
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
    getLocaleInfo(): { language: string; country: string; tag: string; }; // \u7CFB\u7EDF\u8BED\u8A00/\u533A\u57DF\uFF08language\u3001country\u3001BCP47 tag\uFF09
  }

  // Threads \u63A5\u53E3
  var Threads: Threads;
  interface Threads {
    create(runnable: (() => void) | { run: () => void }): ThreadWrapper; // \u521B\u5EFA\u4E00\u4E2A\u65B0\u7EBF\u7A0B\u5E76\u6267\u884C\u6307\u5B9A\u7684\u4EFB\u52A1
    sleep(millis: number): void; // \u4F11\u7720\u5F53\u524D\u7EBF\u7A0B\u6307\u5B9A\u7684\u6BEB\u79D2\u6570
    yield(): void; // \u8BA9\u51FA\u5F53\u524D\u7EBF\u7A0B\u7684CPU\u65F6\u95F4\u7247\uFF0C\u5141\u8BB8\u5176\u4ED6\u7EBF\u7A0B\u6267\u884C
    currentThread(): ThreadWrapper; // \u83B7\u53D6\u5F53\u524D\u7EBF\u7A0B\u7684ThreadWrapper\u5BF9\u8C61
  }

  // ThreadWrapper \u63A5\u53E3
  interface ThreadWrapper {
    start(): void; // \u542F\u52A8\u7EBF\u7A0B
    join(): void; // \u7B49\u5F85\u7EBF\u7A0B\u4EFB\u52A1\u5B8C\u6210
    join(millis: number): void; // \u7B49\u5F85\u7EBF\u7A0B\u4EFB\u52A1\u5B8C\u6210\uFF0C\u6700\u591A\u7B49\u5F85\u6307\u5B9A\u7684\u6BEB\u79D2\u6570
    interrupt(): void; // \u4E2D\u65AD\u7EBF\u7A0B
    isAlive(): boolean; // \u68C0\u67E5\u7EBF\u7A0B\u662F\u5426\u5B58\u6D3B
    isInterrupted(): boolean; // \u68C0\u67E5\u7EBF\u7A0B\u662F\u5426\u88AB\u4E2D\u65AD
    setName(name: string): void; // \u8BBE\u7F6E\u7EBF\u7A0B\u540D\u79F0
    getName(): string; // \u83B7\u53D6\u7EBF\u7A0B\u540D\u79F0
    setPriority(priority: number): void; // \u8BBE\u7F6E\u7EBF\u7A0B\u4F18\u5148\u7EA7\uFF081-10\uFF09\uFF0C\u6570\u5B57\u8D8A\u5927\u4F18\u5148\u7EA7\u8D8A\u9AD8
    getPriority(): number; // \u83B7\u53D6\u7EBF\u7A0B\u4F18\u5148\u7EA7\uFF081-10\uFF09
    getThread(): any; // \u83B7\u53D6\u5E95\u5C42\u7684Java Thread\u5BF9\u8C61\uFF08\u901A\u5E38\u4E0D\u9700\u8981\u4F7F\u7528\uFF09
  }

  // Java \u63A5\u53E3
  var java: any;
  var Packages: any;
  function JavaImporter(...packages: any[]): any;

  // Intent \u63A5\u53E3
  var Intent: Intent;
  interface Intent {
    open(): void;
  }

  // Access \u63A5\u53E3
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
    hasLocationPermission(): boolean; // \u68C0\u67E5\u662F\u5426\u6709\u4F4D\u7F6E\u6743\u9650
    requestLocationPermissions(): void; // \u7533\u8BF7\u4F4D\u7F6E\u6743\u9650
    isLocationPermissionPermanentlyDenied(): boolean; // \u68C0\u67E5\u4F4D\u7F6E\u6743\u9650\u662F\u5426\u88AB\u6C38\u4E45\u62D2\u7EDD
    hasBluetoothConnectionPermission(): boolean; // \u68C0\u67E5\u662F\u5426\u6709\u84DD\u7259\u8FDE\u63A5\u6743\u9650
    requestBluetoothConnectionPermission(): void; // \u7533\u8BF7\u84DD\u7259\u8FDE\u63A5\u6743\u9650
    isBluetoothPermissionPermanentlyDenied(): boolean; // \u68C0\u67E5\u84DD\u7259\u6743\u9650\u662F\u5426\u88AB\u6C38\u4E45\u62D2\u7EDD
    openBluetoothPermissionSettings(): void; // \u6253\u5F00\u84DD\u7259\u6743\u9650\u8BBE\u7F6E\u9875\u9762
  }

  // MediaStore \u63A5\u53E3
  var MediaStore: MediaStore;
  interface MediaStore {
    // \u56FE\u7247\u64CD\u4F5C
    getImages(): any[];
    getImagesByPath(path: string): any[];
    saveImage(sourcePath: string, displayName?: string, relativePath?: string): string | null;
    saveImage(sourcePath: string): string | null;
    deleteImage(uriString: string): boolean;
    // \u89C6\u9891\u64CD\u4F5C
    getVideos(): any[];
    saveVideo(sourcePath: string, displayName?: string, relativePath?: string): string | null;
    saveVideo(sourcePath: string): string | null;
    deleteVideo(uriString: string): boolean;
    // \u97F3\u9891\u64CD\u4F5C
    getAudios(): any[];
    saveAudio(sourcePath: string, displayName?: string): string | null;
    // \u4E0B\u8F7D\u6587\u4EF6\u64CD\u4F5C
    saveToDownloads(sourcePath: string, displayName?: string): string | null;
    getDownloads(): any[];
    // \u6587\u6863\u64CD\u4F5C
    saveToDocuments(sourcePath: string, displayName?: string): string | null;
    saveToDocuments(sourcePath: string): string | null;
    getDocuments(): any[];
    // \u901A\u7528\u64CD\u4F5C
    readFromUri(uriString: string): number[] | null;
    queryMediaInfo(uriString: string): any;
  }

  // App \u63A5\u53E3
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
    openUrl(url: string, packageName?: string): void; // \u6253\u5F00URL\u5730\u5740\u3002\u5982\u679C\u63D0\u4F9B\u4E86packageName\uFF0C\u5219\u4F18\u5148\u4F7F\u7528\u6307\u5B9A\u5E94\u7528\u6253\u5F00\uFF0C\u5982\u679C\u5E94\u7528\u672A\u5B89\u88C5\u5219\u4F7F\u7528\u6D4F\u89C8\u5668\u6253\u5F00\uFF1B\u5982\u679C\u672A\u63D0\u4F9BpackageName\uFF0C\u5219\u76F4\u63A5\u4F7F\u7528\u6D4F\u89C8\u5668\u6253\u5F00
  }

  // Dialogs \u63A5\u53E3
  var Dialogs: Dialogs;
  interface Dialogs {
    show(title: string, content: string): void;
    show(title: string): void;
    confirm(title: string, content: string, callback: (result: boolean) => void): void;
    input(title: string): string;
    input(title: string, value: object): string;
  }

  // Engines \u63A5\u53E3
  var Engines: Engines;
  interface Engines {
    executeScript(file: string): void;
    executeScriptStr(name: string, content: string): void;
    closeAll(): void;
    closeOther(): void;
    closeHook(): void;
    childScriptCount(): number;
  }

  // FloatDialogs \u63A5\u53E3
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
     * \u663E\u793A\u786E\u8BA4\u5BF9\u8BDD\u6846\uFF0C\u652F\u6301\u52A8\u6001\u4FEE\u6539\u5185\u5BB9\u548C\u56DE\u8C03\u51FD\u6570
     * \u6B64\u65B9\u6CD5\u4F1A\u963B\u585E\u5F53\u524D\u7EBF\u7A0B\uFF0C\u76F4\u5230\u7528\u6237\u70B9\u51FB\u6309\u94AE\u6216\u56DE\u8C03\u51FD\u6570\u8FD4\u56DEtrue
     * \u6CE8\u610F\uFF1A\u6B64\u65B9\u6CD5\u9700\u8981\u5728\u521D\u59CB\u5316FloatDialogs\u65F6\u4F20\u5165scope\u53C2\u6570\u624D\u80FD\u4F7F\u7528
     * @param title \u5F39\u7A97\u6807\u9898
     * @param content \u5F39\u7A97\u5185\u5BB9
     * @param confirmText \u786E\u5B9A\u6309\u94AE\u6587\u5B57
     * @param cancelText \u53D6\u6D88\u6309\u94AE\u6587\u5B57
     * @param callback \u56DE\u8C03\u51FD\u6570\uFF0C\u63A5\u6536\u4E00\u4E2Adialog\u5BF9\u8C61\u4F5C\u4E3A\u53C2\u6570\uFF0C\u53EF\u4EE5\u901A\u8FC7dialog.setContent()\u52A8\u6001\u4FEE\u6539\u5F39\u7A97\u5185\u5BB9\u3002\u5982\u679C\u56DE\u8C03\u51FD\u6570\u8FD4\u56DEtrue\uFF0C\u5219\u81EA\u52A8\u5173\u95ED\u5BF9\u8BDD\u6846\uFF1B\u8FD4\u56DEfalse\u6216\u4E0D\u8FD4\u56DE\u503C\uFF0C\u5219\u7EE7\u7EED\u7B49\u5F85\u7528\u6237\u70B9\u51FB\u6309\u94AE
     * @returns \u5982\u679C\u7528\u6237\u70B9\u51FB\u4E86\u786E\u5B9A\u6309\u94AE\u8FD4\u56DEtrue\uFF0C\u70B9\u51FB\u4E86\u53D6\u6D88\u6309\u94AE\u8FD4\u56DEfalse
     */
    confirm(title: string, content: string, confirmText: string, cancelText: string, callback: (dialog: FloatDialog) => boolean | void): boolean;
  }

  // FloatDialog \u63A5\u53E3
  interface FloatDialog {
    /**
     * \u8BBE\u7F6E\u5BF9\u8BDD\u6846\u5185\u5BB9
     * @param content \u5BF9\u8BDD\u6846\u5185\u5BB9
     */
    setContent(content: string): void;
  }

  // Hid \u63A5\u53E3
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

  // KeyBoards \u63A5\u53E3
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
     * \u667A\u80FD\u65B9\u6CD5\uFF1A\u6839\u636E\u5F53\u524D\u72B6\u6001\u81EA\u52A8\u8DF3\u8F6C\u5230\u5408\u9002\u7684\u9875\u9762
     * - \u5982\u679C\u5DF2\u7ECF\u662F\u9ED8\u8BA4\u8F93\u5165\u6CD5\uFF0C\u8FD4\u56DE true
     * - \u5982\u679C\u672A\u542F\u7528\uFF0C\u8DF3\u8F6C\u5230\u542F\u7528\u9875\u9762\uFF08\u7528\u6237\u9700\u8981\u5148\u542F\u7528\uFF09
     * - \u5982\u679C\u5DF2\u542F\u7528\u4F46\u672A\u8BBE\u4E3A\u9ED8\u8BA4\uFF0C\u5F39\u51FA\u8F93\u5165\u6CD5\u9009\u62E9\u754C\u9762\uFF08\u7528\u6237\u53EF\u4EE5\u9009\u62E9\u4E3A\u9ED8\u8BA4\uFF09
     * @returns \u8FD4\u56DE\u5F53\u524D\u8F93\u5165\u6CD5\u662F\u5426\u5DF2\u8BBE\u4E3A\u9ED8\u8BA4\uFF08true\u8868\u793A\u5DF2\u662F\u9ED8\u8BA4\uFF0Cfalse\u8868\u793A\u9700\u8981\u7528\u6237\u64CD\u4F5C\uFF09
     */
    showInputMethodPicker(): boolean;
  }

  // Log \u63A5\u53E3
  var Log: log;
  interface log {
    setFile(filename: string): boolean;
    log(...obj: object): void;
  }

  // WebSocket \u63A5\u53E3
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

  // Audio \u63A5\u53E3
  var Audio: Audio;
  interface Audio {
    load(source: string): boolean; // \u8F7D\u5165\u97F3\u9891\u8D44\u6E90\uFF08\u4E0D\u4F1A\u81EA\u52A8\u64AD\u653E\uFF09\uFF0C\u652F\u6301 http(s)\u3001file://\u3001content://\u3001\u7EDD\u5BF9\u8DEF\u5F84\u3001project:// \u524D\u7F00
    play(source: string): boolean; // \u52A0\u8F7D\u5E76\u64AD\u653E\u97F3\u9891
    play(): boolean; // \u64AD\u653E\u5F53\u524D\u5DF2\u52A0\u8F7D\u7684\u97F3\u9891
    pause(): boolean; // \u6682\u505C\u64AD\u653E
    stop(): boolean; // \u505C\u6B62\u64AD\u653E\uFF08\u64AD\u653E\u4F4D\u7F6E\u91CD\u7F6E\u5230\u5F00\u5934\uFF09
    release(): void; // \u91CA\u653E\u64AD\u653E\u5668\u8D44\u6E90
    seekTo(msec: number): boolean; // \u8DF3\u8F6C\u5230\u6307\u5B9A\u4F4D\u7F6E\uFF08\u6BEB\u79D2\uFF09
    setLooping(looping: boolean): boolean; // \u8BBE\u7F6E\u662F\u5426\u5FAA\u73AF\u64AD\u653E
    setVolume(leftVolume: number, rightVolume: number): boolean; // \u8BBE\u7F6E\u5DE6\u53F3\u58F0\u9053\u97F3\u91CF 0.0~1.0
    isPlaying(): boolean; // \u662F\u5426\u6B63\u5728\u64AD\u653E
    isLoaded(): boolean; // \u662F\u5426\u5DF2\u52A0\u8F7D\u97F3\u9891
    getDuration(): number; // \u83B7\u53D6\u97F3\u9891\u603B\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09\uFF0C\u672A\u52A0\u8F7D\u8FD4\u56DE -1
    getCurrentPosition(): number; // \u83B7\u53D6\u5F53\u524D\u64AD\u653E\u4F4D\u7F6E\uFF08\u6BEB\u79D2\uFF09\uFF0C\u672A\u52A0\u8F7D\u8FD4\u56DE -1
    getCurrentSource(): string; // \u83B7\u53D6\u5F53\u524D\u52A0\u8F7D\u7684\u97F3\u9891\u6E90\u8DEF\u5F84
    canPlayInBackground(): boolean; // \u662F\u5426\u5177\u5907\u540E\u53F0\u64AD\u653E\u80FD\u529B
    hasForegroundServicePermission(): boolean; // \u662F\u5426\u5DF2\u58F0\u660E\u524D\u53F0\u670D\u52A1\u6743\u9650
  }

  // DeekeScriptJson \u63A5\u53E3
  var DeekeScriptJson: DeekeScriptJson;
  interface DeekeScriptJson {
    setDeekeScriptJsonGroup(str: string): void;
    setSettingLists(str: string): void;
    toJson(): object;
  }

  // ForegroundServiceBridge \u63A5\u53E3
  var ForegroundServiceBridge: foregroundServiceBridge;
  interface foregroundServiceBridge {
    startService(): void;
    register(func: Function): void;
    setContent(title: string, content: string): void;
    stopService(): void;
  }

  // NotificationBridge \u63A5\u53E3
  var NotificationBridge: notificationBridge;
  interface notificationBridge {
    startService(): void;
    startListening(
      onNotification: (packageName: string, title: string, text: string) => void,
      onNotificationRemoved: (packageName: string, title: string, text: string) => void
    ): void;
    stopService(): void;
  }

  // Global \u7C7B\u578B\u522B\u540D
  type Storage = Storage;
  type WebSocket = WebSocket;

  // DeekeScript \u63A5\u53E3
  var DeekeScript: DeekeScript;
  interface DeekeScript {
    version(): number;
    readFile(path: string): string | null; // \u8BFB\u53D6 JS \u9879\u76EE\u76EE\u5F55\u4E0B\u7684\u6587\u4EF6\u5185\u5BB9
    getProjectRoot(): string; // \u83B7\u53D6\u5F53\u524D JS \u9879\u76EE\u7684\u6839\u76EE\u5F55\u7EDD\u5BF9\u8DEF\u5F84
    getNodeFields(): string[]; // \u83B7\u53D6\u53EF\u8BBE\u7F6E\u7684\u8282\u70B9\u5B57\u6BB5\u540D\u5217\u8868
    getAllAccessibilityNodeInfo(bool: boolean, fields: string[]): { nodes: DeekeNodeInfo[] } | null; // \u4E00\u6B21\u6027\u83B7\u53D6\u5F53\u524D\u754C\u9762\u6240\u6709\u63A7\u4EF6\u7684\u8282\u70B9\u4FE1\u606F
  }

  // DeekeBounds \u63A5\u53E3
  interface DeekeBounds {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  // DeekeNodeInfo \u63A5\u53E3
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
`},_=function(){var i=C()(c()().mark(function e(n){var t;return c()().wrap(function(s){for(;;)switch(s.prev=s.next){case 0:try{n.languages.register({id:"deekescript"}),t=P(),n.languages.typescript.javascriptDefaults.addExtraLib(t,"deekescript.d.ts"),console.log("DeekeScript API \u7C7B\u578B\u5B9A\u4E49\u5DF2\u6DFB\u52A0")}catch(l){console.error("\u8BBE\u7F6EDeekeScript API\u65F6\u51FA\u9519:",l)}case 1:case"end":return s.stop()}},e)}));return function(n){return i.apply(this,arguments)}}(),x=function(e){e!==void 0&&o.onChange(e)};return(0,b.jsx)("div",{style:{border:"1px solid #d9d9d9",borderRadius:6,overflow:"hidden"},children:(0,b.jsx)(d.ZP,{height:o.height||400,language:"javascript",theme:o.theme||"eye-care-green",value:o.value,onChange:x,beforeMount:k,onMount:S,options:{selectOnLineNumbers:!0,roundedSelection:!1,readOnly:!1,cursorStyle:"line",automaticLayout:!0,mouseWheelZoom:!0,wordWrap:"on",lineNumbers:"on",minimap:{enabled:!1},scrollBeyondLastLine:!1,fontSize:16,tabSize:2,insertSpaces:!0,detectIndentation:!1,suggest:{showKeywords:!0,showSnippets:!0,showFunctions:!0,showConstructors:!0,showFields:!0,showVariables:!0,showClasses:!0,showStructs:!0,showInterfaces:!0,showModules:!0,showProperties:!0,showEvents:!0,showOperators:!1,showUnits:!1,showValues:!1,showConstants:!0,showEnums:!0,showEnumMembers:!0,showColors:!1,showFiles:!1,showReferences:!1,showFolders:!1,showTypeParameters:!0,showIssues:!1,showUsers:!1,showWords:!1},parameterHints:{enabled:!0},hover:{enabled:!0},quickSuggestions:{other:!0,comments:!1,strings:!1},suggestOnTriggerCharacters:!0,acceptSuggestionOnEnter:"on",tabCompletion:"on",wordBasedSuggestions:!1}})})};p.Z=h}}]);
